# soleX — Production System Architecture & Engineering Blueprint

**Client:** soleX (Real Estate Master-Franchise & Mandate Operating System)  
**Document Version:** 1.0 (Production Architecture Proposal)  
**Author:** Principal Full-Stack Architect & Lead Enterprise UX/UI Designer

---

## 1. Executive Summary & Production Architecture Proposal

**soleX** operates as a master-franchise real estate platform in India, managing exclusive and joint developer mandates across high-rise residential and commercial projects. Unlike traditional CRMs that treat leads, inventory, and brokerage payouts as siloed modules, soleX unifies **real-time unit inventory**, **internal mandate sales teams**, **external RERA-registered channel partners (brokers)**, and **financial commission ledgers** into a single transactional operating system.

### 1.1 High-Level Production Stack

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT TIER (Edge / Web)                              │
│  • Next.js (App Router, React Server Components + Client Interactive Canvases)         │
│  • TypeScript, Tailwind CSS, Zustand (Optimistic UI & Realtime Subscription Sync)      │
│  • Three.js WebGL 3D Architectural Massing & Interactive Unit Stacking Matrix          │
│  • Recharts Executive Analytics                                                        │
└───────────────────┬────────────────────────────────────────────────┬───────────────────┘
                    │ HTTPS / REST + SSE                             │ WSS (Realtime)
┌───────────────────▼────────────────────────────────────────────────▼───────────────────┐
│                           APPLICATION & API GATEWAY TIER                               │
│  • Node.js / Next.js Route Handlers & Dedicated Express Micro-Services                 │
│  • RBAC & JWT Session Verification Middleware (Supabase Auth + Custom Claims)          │
│  • Server-Side Gemini AI Proxy (@google/genai: gemini-4-argon / 3.8-flash / 3.1-lite)  │
│  • Transactional Booking Engine & Commission Ledger Calculator                         │
└───────────────────┬────────────────────────────────────────────────┬───────────────────┘
                    │ Connection Pool (PgBouncer / Supavisor)        │ Event Triggers
┌───────────────────▼────────────────────────────────────────────────▼───────────────────┐
│                        DATA, PERSISTENCE & STORAGE TIER (Supabase)                     │
│  • PostgreSQL 16 (ACID Transactions, Row-Level Security, Pessimistic Locking)          │
│  • Supabase Realtime (Postgres CDCWal -> Live Inventory Matrix Broadcast)              │
│  • Supabase Storage (RERA Certificates, KYC Documents, Cost Sheets, Allotment PDFs)    │
│  • Upstash Redis (Distributed Unit Hold Locks with TTL & Rate Limiting)                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Role-Based Access Control (RBAC) in Production

soleX enforces strict multi-tenant and role-based isolation across four primary personas:
1. **`MANDATE_ADMIN` (Executive / HQ):** Full read/write visibility across all mandated projects, developer commercial terms, unit pricing matrices, complete lead pipelines, and commission payout approvals.
2. **`SITE_SALES_MANAGER` (Internal Staff):** Scoped to assigned `project_id`s. Can manage site visits, place temporary unit holds, and initiate booking workflows for buyer leads.
3. **`CHANNEL_PARTNER` (External RERA Broker):** Strictly isolated via PostgreSQL **Row-Level Security (RLS)** to leads where `assigned_broker_id = auth.uid()` and commission records where `broker_id = auth.uid()`. Brokers can view sanitized unit availability (`Available` / `Hold` / `Sold` and base agreement estimates) without seeing confidential developer mandate margins or other brokers' buyer PII.
4. **`FINANCE_AUDITOR`:** Read access to bookings and write access to commission disbursement workflows, TDS deductions, and GST invoice verification.

#### Production RBAC Enforcement Strategy (Defense-in-Depth)
- **Layer 1 — Custom JWT Claims:** On authentication via Supabase Auth, a Postgres `custom_access_token_hook` injects `{ app_role: 'ADMIN' | 'BROKER', broker_id: UUID, organization_id: UUID }` into the signed JWT.
- **Layer 2 — Edge Middleware:** Next.js middleware inspects the verified JWT before rendering route groups (`/admin/*` vs. `/broker/*`), redirecting unauthorized requests at the edge.
- **Layer 3 — PostgreSQL Row-Level Security (RLS):** Every database query executes with the authenticated user's JWT context. Even if an API endpoint were misconfigured, Postgres refuses to return rows outside the broker's ownership scope:

```sql
-- Example Production RLS Policy on `leads` table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to leads"
ON public.leads
FOR ALL
TO authenticated
USING ( (auth.jwt() ->> 'app_role') = 'ADMIN' );

CREATE POLICY "Brokers can only view and insert their own leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'app_role') = 'BROKER'
  AND assigned_broker_id = (auth.jwt() ->> 'broker_id')::uuid
);
```

---

## 2. Data Relational Model & Transactional Integrity

### 2.1 Core Relational Schema (`Projects -> Units -> Leads -> Bookings -> Commissions`)

```
┌──────────────────────┐       1 : N       ┌──────────────────────┐
│       projects       │──────────────────▶│        units         │
├──────────────────────┤                   ├──────────────────────┤
│ id (PK, UUID)        │                   │ id (PK, UUID)        │
│ name                 │                   │ project_id (FK)      │
│ developer_name       │                   │ unit_number (A-101)  │
│ rera_number          │                   │ wing, floor, bhk     │
│ mandate_type         │                   │ carpet_area_sqft     │
│ mandate_comm_pct     │                   │ base_price_inr       │
│ broker_share_pct     │                   │ status (ENUM)        │
└──────────┬───────────┘                   │ version (INT)        │
           │                               │ held_until (TIMESTZ) │
           │ 1 : N                         └──────────┬───────────┘
           ▼                                          │ 1 : 1 (Active)
┌──────────────────────┐       1 : 1       ┌──────────▼───────────┐
│        leads         │──────────────────▶│       bookings       │
├──────────────────────┤                   ├──────────────────────┤
│ id (PK, UUID)        │                   │ id (PK, UUID)        │
│ project_id (FK)      │                   │ unit_id (FK, UNIQUE) │
│ assigned_broker_id   │───┐               │ lead_id (FK)         │
│ buyer_name, phone    │   │               │ broker_id (FK)       │
│ stage (ENUM)         │   │               │ agreement_value_inr  │
│ budget_inr           │   │               │ booking_token_inr    │
└──────────────────────┘   │               │ status (CONFIRMED)   │
                           │               └──────────┬───────────┘
                           │ N : 1                    │ 1 : 1
               ┌───────────▼──────────┐    ┌──────────▼───────────┐
               │       brokers        │◀───│     commissions      │
               ├──────────────────────┤    ├──────────────────────┤
               │ id (PK, UUID)        │    │ id (PK, UUID)        │
               │ firm_name, rera_id   │    │ booking_id (FK)      │
               │ tier (PLATINUM/GOLD) │    │ broker_id (FK)       │
               │ gst_number, pan_no   │    │ gross_comm_inr       │
               └──────────────────────┘    │ tds_deducted_inr     │
                                           │ net_payable_inr      │
                                           │ payout_status (ENUM) │
                                           └──────────────────────┘
```

### 2.2 PostgreSQL DDL Specification

```sql
CREATE TYPE unit_status AS ENUM ('AVAILABLE', 'HOLD', 'SOLD');
CREATE TYPE lead_stage AS ENUM ('NEW', 'SITE_VISIT', 'NEGOTIATION', 'BOOKED', 'LOST');
CREATE TYPE commission_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'RELEASED');

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  developer_name TEXT NOT NULL,
  rera_number TEXT UNIQUE NOT NULL,
  mandate_type TEXT NOT NULL CHECK (mandate_type IN ('Exclusive Mandate', 'Joint Mandate')),
  mandate_comm_pct NUMERIC(5,2) NOT NULL, -- e.g. 4.50% from Developer to soleX
  broker_share_pct NUMERIC(5,2) NOT NULL, -- e.g. 2.00% passed to Channel Partner
  total_units INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  rera_id TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Platinum', 'Gold', 'Silver')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  wing TEXT NOT NULL,
  floor INT NOT NULL,
  bhk TEXT NOT NULL,
  carpet_area_sqft INT NOT NULL,
  base_price_inr BIGINT NOT NULL,
  facing TEXT NOT NULL,
  status unit_status NOT NULL DEFAULT 'AVAILABLE',
  held_by_lead_id UUID,
  held_until TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1, -- Optimistic concurrency version counter
  UNIQUE (project_id, unit_number)
);

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  assigned_broker_id UUID NOT NULL REFERENCES public.brokers(id),
  buyer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interested_bhk TEXT NOT NULL,
  budget_inr BIGINT NOT NULL,
  stage lead_stage NOT NULL DEFAULT 'NEW',
  booked_unit_id UUID REFERENCES public.units(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  unit_id UUID NOT NULL UNIQUE REFERENCES public.units(id), -- Partial/Unique constraint prevents double booking
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  broker_id UUID NOT NULL REFERENCES public.brokers(id),
  agreement_value_inr BIGINT NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.brokers(id),
  commission_pct NUMERIC(5,2) NOT NULL,
  commission_amount_inr BIGINT NOT NULL,
  status commission_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Preventing Double-Booking & Race Conditions (Concurrency Control)

A critical risk in high-velocity real estate mandate launches is **two sales managers or brokers attempting to book the same apartment unit (`e.g., Unit A-402`) simultaneously**.

soleX prevents double-booking using a **Three-Tier Concurrency Strategy**:

1. **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE NOWAIT`):**
   The entire Lead-to-Booking workflow executes inside a single PostgreSQL stored procedure (`confirm_unit_booking`) wrapped in a `SERIALIZABLE` or `READ COMMITTED` transaction with an explicit row lock on the target unit:
   ```sql
   BEGIN;

   -- 1. Lock the target unit row immediately; fail fast if another transaction holds the lock
   SELECT id, status, version
   INTO v_unit
   FROM public.units
   WHERE id = p_unit_id
   FOR UPDATE NOWAIT;

   -- 2. Verify unit is AVAILABLE (or held by this specific lead)
   IF v_unit.status = 'SOLD' OR (v_unit.status = 'HOLD' AND v_unit.held_by_lead_id != p_lead_id) THEN
     RAISE EXCEPTION 'CONFLICT_UNIT_UNAVAILABLE: Unit % is already %', p_unit_id, v_unit.status;
   END IF;

   -- 3. Update Unit status & increment optimistic version
   UPDATE public.units
   SET status = 'SOLD',
       version = version + 1,
       held_until = NULL
   WHERE id = p_unit_id;

   -- 4. Insert immutable Booking record (enforced by UNIQUE constraint on unit_id)
   INSERT INTO public.bookings (project_id, unit_id, lead_id, broker_id, agreement_value_inr)
   VALUES (p_project_id, p_unit_id, p_lead_id, p_broker_id, p_agreement_value)
   RETURNING id INTO v_booking_id;

   -- 5. Advance Lead stage to BOOKED
   UPDATE public.leads
   SET stage = 'BOOKED', booked_unit_id = p_unit_id
   WHERE id = p_lead_id;

   -- 6. Automatically generate Broker Commission Ledger entry
   INSERT INTO public.commissions (booking_id, broker_id, commission_pct, commission_amount_inr, status)
   VALUES (v_booking_id, p_broker_id, p_broker_pct, (p_agreement_value * p_broker_pct / 100), 'PENDING_APPROVAL');

   COMMIT;
   ```
2. **Optimistic Concurrency Version Check (`version` column):**
   When a user opens the 4-Step Booking Modal on the frontend, the client captures the unit's current `version` integer. If another user places the unit on `HOLD` while the modal is open, the `version` increments and Supabase Realtime pushes the state update to all connected clients, immediately alerting the user before form submission.
3. **Time-Bounded Unit Holds (TTL Expiration):**
   When a unit is placed on `HOLD` during buyer cheque verification, `held_until` is set to `now() + interval '24 hours'`. A `pg_cron` job (and Redis key expiry listener) automatically releases expired holds back to `AVAILABLE` and logs an audit event.

---

## 3. Security & Cloud Infrastructure Strategy

### 3.1 Cloud Topology (Vercel + AWS Mumbai `ap-south-1` / Supabase)

To comply with Indian data residency norms (DPDP Act) and achieve sub-50ms latency for field sales teams on mobile networks at project sites across Mumbai, Bengaluru, NCR, and Pune:

- **Frontend & Edge Compute:** Deployed on **Vercel Enterprise** (pinned to `bom1` Mumbai Edge Region) or **AWS ECS Fargate (`ap-south-1`)** behind CloudFront WAF.
- **Database & Realtime Engine:** **Supabase Dedicated Tier** hosted in `ap-south-1 (Mumbai)` with Point-in-Time Recovery (PITR) and read replicas for executive analytics queries.
- **Document Vault:** AWS S3 / Supabase Storage in `ap-south-1` with short-lived pre-signed URLs (15-minute expiry) for buyer PAN/Aadhaar KYC documents and signed booking forms.

### 3.2 Public Client Configuration vs. Secure Backend Secrets

| Variable / Credential | Classification | Storage Location | Access Pattern |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Endpoint | Public Env Config | Safe in browser; points to API gateway |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Scoped Token | Public Env Config | Safe in browser; restricted strictly by Postgres RLS policies |
| `SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL SECRET** | Encrypted Server Vault (Vercel/AWS Secrets Manager) | **Server-Only.** Never prefixed with `NEXT_PUBLIC_` or `VITE_`. Used only in trusted backend workers |
| `GEMINI_API_KEY` | **CRITICAL SECRET** | Encrypted Server Vault | **Server-Only (`/api/chat`).** Invoked exclusively by backend `@google/genai` SDK; never exposed to client bundles |
| `DATABASE_URL` | **CRITICAL SECRET** | Encrypted Server Vault | **Server-Only.** Used for Prisma/Drizzle migrations and transactional RPC execution |
| `WEBHOOK_SIGNING_SECRET` | **CRITICAL SECRET** | Encrypted Server Vault | **Server-Only.** Validates payment gateway (Razorpay/Cashfree) booking token webhooks |

### 3.3 Immutable Audit Trail
Every state transition—lead registration, stage progression, unit hold, booking confirmation, and commission release—writes an append-only row to `public.audit_events` capturing `actor_id`, `actor_role`, `entity_type`, `entity_id`, `previous_state`, `new_state`, `ip_address`, and `created_at`.
