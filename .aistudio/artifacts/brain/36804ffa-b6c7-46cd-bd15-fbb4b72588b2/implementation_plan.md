# soleX — Real Estate Master-Franchise Operating System

An enterprise-grade real estate mandate and channel sales platform that connects live project inventory, multi-step lead-to-booking conversions, channel partner commission ledgers, an interactive 3D architectural tower visualizer, and a role-aware AI Deal Copilot in a single reactive state ecosystem.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions have been finalized based on your preferences and domain requirements. Please review before we proceed to build.

- **Confirmed Decision 1 (Interactive 3D Tower in Project Inventory)**: The Project & Inventory Matrix screen includes a seamless switch between the 2D Floor-by-Floor Inventory Grid and an interactive Three.js 3D Architectural Tower View, with live unit color-coding (Available = Emerald Green, On Hold = Amber, Sold = Slate) and click-to-inspect unit slide-over.
- **Confirmed Decision 2 (Role-Aware Deal Copilot Slide-Over)**: A global slide-over AI assistant powered by server-side Gemini models (`gemini-4-argon` for deep mandate/deal structuring, `gemini-3.8-flash` for general sales Q&A, and `gemini-3.1-flash-lite` for fast lookup) adapts its system persona and live data context automatically based on whether the active role is **Admin** or **Broker**.
- **Confirmed Decision 3 (Deep Indigo & Cool Slate Enterprise Palette)**: The interface uses a high-trust enterprise SaaS palette anchored by Deep Indigo (`#4F46E5`) primary actions, crisp white (`#FFFFFF`) surface containers, cool Slate (`#0F172A` to `#F8FAFC`) structural hierarchy, and strict tabular numerals (`tabular-nums`) for all INR (`₹` Cr / Lakh) financial figures.
- **Architectural Deliverable (`ARCHITECTURE.md`)**: Will be generated first in the workspace root covering the production Next.js + Node.js/Supabase architecture, relational schema (`Projects -> Units -> Leads -> Bookings -> Commissions`), pessimistic/optimistic concurrency locks to prevent double-booking, and cloud security posture.

---

### 1. Overview & Core Concept

- **What It Does**: **soleX** enables real estate master-franchise operators in India to manage developer mandates end-to-end—tracking high-rise unit availability, orchestrating site visits and buyer negotiations, converting leads into confirmed unit bookings, and automating channel partner brokerage payouts.
- **Target Audience / Persona**:
  - **Mandate Directors & Sales Admins**: Oversee portfolio-wide sales velocity, inventory absorption across towers, mandate terms, lead pipelines, and broker commission approvals.
  - **Channel Partners (Brokers)**: External RERA-registered brokers who log in via the Role Switcher to track their attributed buyer leads and monitor pending or released commission payouts.
- **Key Value**: Eliminates fragmented spreadsheets between developer inventory teams, site sales managers, and external brokers by ensuring a single booking action atomically updates inventory matrices (2D & 3D), executive KPIs, activity audit feeds, and broker commission ledgers.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Executive Assessment (Command Centre)**: The Admin inspects live portfolio KPIs (Active Projects, Inventory Available vs. Sold, Monthly Sales Volume in `₹ Cr`, Pending Broker Commissions in `₹ Lakh`), analyzes the 6-month Sales Conversions bar chart, and reviews the real-time Activity Audit Feed.
  2. **2D & 3D Spatial Inventory Inspection (Project & Inventory Matrix)**: Selecting a project (e.g., *Skyline Towers*, *Emerald Crest*, *Aurelia One*) displays mandate terms, developer details, and floor-by-floor apartment units (`101`, `102`, `201`...). Users can inspect units in the structured 2D matrix or switch to the interactive **Three.js 3D Tower View** to orbit the composite architectural tower, filter by status/BHK, or explode floors vertically. Clicking any unit in 2D or 3D opens the right-side Unit Detail Slide-Over (`BHK`, `Carpet Area sq.ft`, `Base Price ₹`, `Floor Rise`, current status, and quick actions to place on Hold or initiate a Booking).
  3. **Atomic Lead-to-Booking Conversion (The Core Demo)**: In the Lead Pipeline (Kanban & List toggle across *New*, *Site Visit*, *Negotiation*, *Booked*), clicking **"Convert to Booking"** opens a guided 4-step workflow modal:
     - *Step 1*: Confirm Lead & Buyer KYC details.
     - *Step 2*: Select an *Available* (or *On Hold*) Unit from the project's live inventory with automatic price & stamp duty calculation.
     - *Step 3*: Assign the attributing Channel Partner (Broker) and preview calculated brokerage commission (`%` of agreement value).
     - *Step 4*: Review summary & confirm booking.
     - **Immediate Reactive Impact**: Confirming immediately marks the unit as **Sold** across the 2D Grid and 3D Tower, increments Monthly Sales Volume and Pending Broker Commissions on the Command Centre, moves the lead to **Booked**, logs a timestamped event in the Activity Feed, and credits the assigned broker's commission ledger.
  4. **Role-Based Access Switching (Broker Portal View)**: Switching the top header Role Switcher from **Admin (Mandate HQ)** to **Broker (Channel Partner)** dynamically scopes the navigation sidebar to **My Leads** and **My Commissions**, switches the active broker persona selector (e.g., *Rahul Sharma — Apex Realty*), and restricts all metrics, pipelines, and commission ledgers strictly to that broker's attributed records.
  5. **AI Deal & Mandate Copilot**: Clicking the **Deal Copilot** button in the top header opens a multi-turn conversational slide-over backed by Gemini. Users can switch task modes (*Fast Lookup* via `gemini-3.1-flash-lite`, *General Copilot* via `gemini-3.8-flash`, or *Deep Deal & Mandate Structuring* via `gemini-4-argon`) to draft client payment schedules, analyze inventory absorption bottlenecks, or query live project availability.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-trust Enterprise SaaS (`Plus Jakarta Sans` for crisp structural headers and navigation, `Public Sans` for dense operational legibility, and `JetBrains Mono` with `tabular-nums` for INR currency metrics, unit codes, and RERA IDs).
  - *Color Palette & Mood*:
    - **60% Dominant Canvas**: Cool Alabaster Slate (`#F8FAFC`) workspace background with crisp White (`#FFFFFF`) single-elevation surface cards.
    - **30% Structural Surfaces**: Deep Slate (`#0F172A`) navigation sidebar, hairline borders (`#E2E8F0`), and muted secondary typography (`#64748B`).
    - **10% Accent & Semantic State Budget**: Deep Indigo (`#4F46E5`) primary interactive controls; explicit dual-coded unit state indicators combining color + label/icon:
      - **Available**: Emerald (`#16A34A` / `#ECFDF5` surface)
      - **On Hold**: Amber (`#D97706` / `#FFFBEB` surface)
      - **Sold**: Slate (`#475569` / `#F1F5F9` surface)
  - *Component Styling & Layout*: Full-viewport desktop layout (`256px` fixed left sidebar + top contextual header bar + fluid main viewport). Zero nested card-within-card clutter; clean hairline dividers; unboxed metadata with middle-dot (`·`) separators.
  - *3D Tower Viewport Craft*: Built with Three.js using a composite multi-part procedural architectural model (podium base, landscaped terrace, structural core, glass curtain-wall bays, balcony slabs, penthouse crown, and interactive unit bays), studio `RoomEnvironment` PBR reflections, warm directional key light + cool hemisphere fill, damped `OrbitControls`, and a compact collapsible bottom control dock (`<= 15%` footprint, solid `rgba` surface with no `backdrop-filter` over WebGL).

- **Interactive Feedback & Motion**:
  - Smooth `150ms–200ms` slide-over drawers for Unit Inspection and the AI Deal Copilot.
  - Instant toast confirmation banner upon completing a Lead-to-Booking workflow or changing a unit's hold status, with a direct shortcut to inspect the updated Inventory Matrix or Command Centre KPIs.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Reactive Global Store with Atomic Cross-Entity Transactions**
  - *Chosen Approach*: Centralized reactive state store holding normalized `Projects`, `Units`, `Leads`, `Brokers`, `Bookings`, and `ActivityEvents`, exposed with atomic action dispatchers (`convertLeadToBooking`, `updateUnitStatus`, `registerLead`, `releaseCommission`).
  - *Why*: Guarantees zero state drift between the 4 connected screens and the 3D WebGL scene—booking a unit updates all derived KPIs, charts, 2D grids, 3D unit materials, and broker ledgers in a single synchronous transaction.
  - *Alternatives Considered*: Separate screen-level state or static mock arrays, which would fail the client's core requirement that actions in one screen immediately reflect in another.

- **Decision 2: Dual 2D Matrix + Interactive Three.js 3D Tower in Project Inventory**
  - *Chosen Approach*: Provide both a high-density 2D Floor/Wing grid and an interactive 3D Architectural Tower canvas synchronized to the exact same unit state and slide-over inspector.
  - *Why*: Sales managers need rapid tabular scanning during phone calls (2D Grid) as well as spatial floor-plate, elevation, and orientation storytelling when presenting to homebuyers in the experience center (3D Tower).
  - *Alternatives Considered*: Only a 2D grid (misses spatial floor-rise context) or only a 3D view (slower for bulk tabular scanning).

- **Decision 3: Server-Side Multi-Model Gemini Deal Copilot**
  - *Chosen Approach*: Route all Gemini chat requests through an Express backend endpoint (`/api/chat`) using `@google/genai`, injecting live portfolio state (available units, lead stages, mandate terms, active role) into the system instruction, while letting users select between `gemini-4-argon` (Deep Analysis), `gemini-3.8-flash` (Balanced), and `gemini-3.1-flash-lite` (Fast).
  - *Why*: Protects API credentials on the server, grounds every AI response in the live state of the prototype (so asking *"Which 3BHK units are still available in Skyline Towers?"* returns the exact post-booking availability), and fulfills multi-tier reasoning needs.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                        soleX Global Reactive State Store                           │
│  [Projects] ──< [Units (101..1204)] ──< [Bookings] >── [Leads] >── [Brokers]       │
│  [Activity Feed Log]    [Active Role: Admin | Broker]    [Active Broker Persona]   │
└───────────────┬──────────────────────┬───────────────────────┬─────────────────────┘
                │                      │                       │
      ┌─────────▼─────────┐  ┌─────────▼──────────┐  ┌─────────▼──────────┐
      │   Global Shell    │  │ 4 Connected Views  │  │ Slide-Over Drawers │
      │ ───────────────── │  │ ────────────────── │  │ ────────────────── │
      │ • Role Switcher   │  │ 1. Command Centre  │  │ • Unit Inspector   │
      │   (Admin/Broker)  │  │    KPIs + Recharts │  │   (BHK, Price,     │
      │ • Dynamic Sidebar │  │    + Activity Feed │  │    Hold/Book CTA)  │
      │ • New Lead Modal  │  │ 2. Inventory Matrix│  │ • 4-Step Lead-to-  │
      │ • Toast Notifier  │  │    2D Grid +       │  │   Booking Modal    │
      └───────────────────┘  │    Three.js 3D     │  │ • Gemini AI Deal   │
                             │    Tower Canvas    │  │   Copilot Drawer   │
                             │ 3. Lead Pipeline   │  └─────────┬──────────┘
                             │    Kanban & List   │            │ POST /api/chat
                             │ 4. Broker Portal   │  ┌─────────▼──────────┐
                             │    My Leads &      │  │  Express Server    │
                             │    My Commissions  │  │  @google/genai SDK │
                             └────────────────────┘  └────────────────────┘
```

- **Data Model & State**:
  - **Project**: `id`, `name`, `location`, `developerName`, `reraNumber`, `mandateType` (Exclusive / Joint), `mandateCommissionPct`, `brokerSharePct`, `totalUnits`, `floors`, `wings`.
  - **Unit**: `id`, `projectId`, `unitNumber` (e.g., `A-101`, `A-402`), `floor`, `wing`, `bhk` (`2 BHK`, `3 BHK`, `4 BHK Penthouse`), `carpetAreaSqFt`, `basePriceInr`, `facing`, `status` (`Available` | `Hold` | `Sold`), `heldByLeadId?`, `bookedByLeadId?`.
  - **Lead**: `id`, `name`, `phone`, `email`, `projectId`, `interestedBhk`, `budgetInr`, `stage` (`New` | `Site Visit` | `Negotiation` | `Booked`), `assignedBrokerId`, `notes`, `createdAt`, `bookedUnitId?`.
  - **Broker (Channel Partner)**: `id`, `name`, `firmName`, `reraId`, `phone`, `tier` (`Platinum` | `Gold` | `Silver`), `totalBookings`, `pendingCommissionInr`, `paidCommissionInr`.
  - **Booking & Commission Record**: `id`, `unitId`, `projectId`, `leadId`, `brokerId`, `agreementValueInr`, `commissionAmountInr`, `commissionStatus` (`Pending Approval` | `Approved` | `Released`), `bookedAt`.

- **Interactive Component & State Mapping**:
  - **Command Centre**: Computes real-time aggregates from `Units`, `Bookings`, and `Brokers`. Includes interactive timeframe/project filters on the Recharts 6-month sales velocity bar chart, clickable KPI cards that navigate to the relevant view, and a live Activity Feed that prepends every booking, hold, lead creation, or payout action.
  - **Project & Inventory Matrix (2D + 3D)**:
    - *Project Selector & Filters*: Switch between mandated projects (*Skyline Towers*, *Emerald Crest*, *Aurelia One*) and filter units by status (`All`, `Available`, `Hold`, `Sold`), floor range, or configuration (`2 BHK`, `3 BHK`, `4 BHK`).
    - *Three.js 3D Tower View*: Renders a multi-part procedural high-rise tower where each apartment bay is a distinct selectable mesh colored by its live status. Includes a collapsible bottom HUD dock for Floor Explode slider, Elevation Camera Presets (*North Facade*, *South-West Aerial*, *Penthouse Crown*), and Lighting mood (*Daylight Studio*, *Golden Hour*). Raycast clicking a 3D unit opens the exact same Unit Slide-Over panel as clicking a 2D card.
    - *Unit Detail Slide-Over*: Displays comprehensive pricing sheet (Base Price, Floor Rise, PLC, GST/Stamp Duty estimate), allows toggling status between `Available` and `Hold`, or launching the **Convert to Booking** modal pre-filled with that unit.
  - **Lead-to-Booking Workflow**:
    - *Kanban & List View*: Drag/move leads across stages (`New` -> `Site Visit` -> `Negotiation` -> `Booked`), search by buyer name, or register a new lead.
    - *4-Step Booking Modal*: Validates selection at each step, prevents selecting already-sold units, calculates exact broker commission in INR based on project mandate terms, and commits the atomic booking update.
  - **Broker Portal View**:
    - Toggling the header Role Switcher to `Broker` collapses the sidebar to `My Leads` and `My Commissions` (and switches Admin-only Finance/HR views out), allowing the evaluator to switch between sample brokers (*Rahul Sharma*, *Priya Nair*, *Vikram Malhotra*) and test registering a new channel lead or tracking commission payout stages.
