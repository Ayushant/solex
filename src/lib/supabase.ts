import type {
  Project,
  PropertyUnit,
  Broker,
  Lead,
  BookingRecord,
  ActivityEvent,
  UserRole,
} from '../store/useSolexStore';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://udnnkhhamdzgdtmufwdk.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbm5raGhhbWR6Z2R0bXVmd2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDY1MjksImV4cCI6MjEwODE4MjUyOX0.Sf4eQa9piJiTGcbuqa0lEFXDOw9ljmrw2cNcLJNL8Xw';

const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Lightweight native Supabase Auth & PostgREST client (zero cold-start dependency overhead)
export const supabase = {
  auth: {
    async signInWithPassword({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<{
      data: { user: { id: string; email?: string; user_metadata?: Record<string, any> } | null };
      error: { message: string } | null;
    }> {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: 'POST',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify({ email, password }),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          return {
            data: { user: null },
            error: {
              message:
                json?.error_description ||
                json?.msg ||
                json?.message ||
                'Invalid login credentials',
            },
          };
        }
        return { data: { user: json.user || null }, error: null };
      } catch {
        return {
          data: { user: null },
          error: { message: 'Supabase Auth endpoint unreachable' },
        };
      }
    },

    async signUp({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, any> };
    }): Promise<{
      data: { user: { id: string; email?: string; user_metadata?: Record<string, any> } | null };
      error: { message: string } | null;
    }> {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: SUPABASE_HEADERS,
          body: JSON.stringify({
            email,
            password,
            data: options?.data || {},
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          return {
            data: { user: null },
            error: {
              message:
                json?.error_description ||
                json?.msg ||
                json?.message ||
                'Unable to sign up user',
            },
          };
        }
        return { data: { user: json.user || json || null }, error: null };
      } catch {
        return {
          data: { user: null },
          error: { message: 'Supabase Auth endpoint unreachable' },
        };
      }
    },

    async signOut(): Promise<{ error: null }> {
      return { error: null };
    },
  },

  from(table: string) {
    return {
      select(columns = '*') {
        const executeSelect = async (querySuffix = ''): Promise<{
          data: any[] | null;
          error: { message: string } | null;
        }> => {
          try {
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(
                columns
              )}${querySuffix}`,
              {
                method: 'GET',
                headers: SUPABASE_HEADERS,
              }
            );
            if (!res.ok) {
              const errJson = await res.json().catch(() => ({}));
              return {
                data: null,
                error: {
                  message:
                    errJson?.message ||
                    `Table '${table}' not initialized in Supabase SQL Editor yet.`,
                },
              };
            }
            const data = await res.json();
            return { data: Array.isArray(data) ? data : [], error: null };
          } catch {
            return {
              data: null,
              error: { message: 'Unable to reach Supabase REST endpoint.' },
            };
          }
        };

        return {
          then(
            onfulfilled?: (value: {
              data: any[] | null;
              error: { message: string } | null;
            }) => any,
            onrejected?: (reason: any) => any
          ) {
            return executeSelect().then(onfulfilled, onrejected);
          },
          order(column: string, opts?: { ascending?: boolean }) {
            const dir = opts?.ascending ? 'asc' : 'desc';
            return {
              limit(count: number) {
                return executeSelect(
                  `&order=${encodeURIComponent(column)}.${dir}&limit=${count}`
                );
              },
            };
          },
        };
      },

      async upsert(
        rows: Record<string, any> | Record<string, any>[]
      ): Promise<{ error: { message: string } | null }> {
        try {
          const payload = Array.isArray(rows) ? rows : [rows];
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              ...SUPABASE_HEADERS,
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            return {
              error: {
                message:
                  errJson?.message ||
                  `Failed to upsert into '${table}'. Ensure you have run the SQL schema script in Supabase SQL Editor.`,
              },
            };
          }
          return { error: null };
        } catch {
          return {
            error: { message: 'Unable to reach Supabase REST endpoint.' },
          };
        }
      },
    };
  },
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  brokerId?: string;
  firmName?: string;
  authMode: 'supabase' | 'enterprise_session';
}

export const DEMO_USERS: AuthenticatedUser[] = [
  {
    id: 'usr-admin-hq',
    email: 'director@solexmandate.in',
    fullName: 'Aarav Mehta',
    role: 'Admin',
    firmName: 'soleX Mandate HQ (Mumbai)',
    authMode: 'enterprise_session',
  },
  {
    id: 'usr-brk-rahul',
    email: 'rahul.sharma@apexrealty.in',
    fullName: 'Rahul Sharma',
    role: 'Broker',
    brokerId: 'brk-rahul',
    firmName: 'Apex Realty Advisors',
    authMode: 'enterprise_session',
  },
  {
    id: 'usr-brk-priya',
    email: 'priya@zenithestamb.in',
    fullName: 'Priya Nair',
    role: 'Broker',
    brokerId: 'brk-priya',
    firmName: 'Zenith Wealth & Estates',
    authMode: 'enterprise_session',
  },
  {
    id: 'usr-brk-vikram',
    email: 'vikram@crestlineprop.in',
    fullName: 'Vikram Malhotra',
    role: 'Broker',
    brokerId: 'brk-vikram',
    firmName: 'Crestline PropTech',
    authMode: 'enterprise_session',
  },
];

// Complete SQL DDL script for Supabase SQL Editor (https://supabase.com/dashboard/project/udnnkhhamdzgdtmufwdk/sql/new)
export const SOLEX_SUPABASE_SCHEMA_SQL = `-- ============================================================================
-- soleX Mandate Operating System — Supabase PostgreSQL Production Schema
-- Designed for: Multi-Project Mandates, Live Inventory Locking, Broker Attribution
-- Target: Supabase SQL Editor (idempotent, safe to run multiple times)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. AUTOMATIC TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CORE MANDATE OPERATING SYSTEM TABLES
-- Projects & Mandates table
CREATE TABLE IF NOT EXISTS public.solex_projects (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unit Inventory & Dynamic Locking table
CREATE TABLE IF NOT EXISTS public.solex_units (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available',
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel Partners & Registered Brokers table
CREATE TABLE IF NOT EXISTS public.solex_brokers (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads & Channel Partner Attribution table
CREATE TABLE IF NOT EXISTS public.solex_leads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  assigned_broker_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Enquiry',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings, Payment Milestones & Brokerage Commission Ledger table
CREATE TABLE IF NOT EXISTS public.solex_bookings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  broker_id TEXT NOT NULL,
  commission_status TEXT NOT NULL DEFAULT 'Accrued',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Trail, System Events & Activity Log table
CREATE TABLE IF NOT EXISTS public.solex_activities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HIGH-PERFORMANCE B-TREE & GIN (JSONB) INDEXES
CREATE INDEX IF NOT EXISTS idx_solex_units_project_id ON public.solex_units(project_id);
CREATE INDEX IF NOT EXISTS idx_solex_units_status ON public.solex_units(status);
CREATE INDEX IF NOT EXISTS idx_solex_units_payload ON public.solex_units USING GIN(payload);

CREATE INDEX IF NOT EXISTS idx_solex_leads_project_id ON public.solex_leads(project_id);
CREATE INDEX IF NOT EXISTS idx_solex_leads_broker_id ON public.solex_leads(assigned_broker_id);
CREATE INDEX IF NOT EXISTS idx_solex_leads_stage ON public.solex_leads(stage);
CREATE INDEX IF NOT EXISTS idx_solex_leads_payload ON public.solex_leads USING GIN(payload);

CREATE INDEX IF NOT EXISTS idx_solex_bookings_project_id ON public.solex_bookings(project_id);
CREATE INDEX IF NOT EXISTS idx_solex_bookings_unit_id ON public.solex_bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_solex_bookings_broker_id ON public.solex_bookings(broker_id);
CREATE INDEX IF NOT EXISTS idx_solex_bookings_comm_status ON public.solex_bookings(commission_status);
CREATE INDEX IF NOT EXISTS idx_solex_bookings_payload ON public.solex_bookings USING GIN(payload);

CREATE INDEX IF NOT EXISTS idx_solex_activities_project_id ON public.solex_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_solex_activities_created_at ON public.solex_activities(created_at DESC);

-- 5. AUTO-UPDATING TIMESTAMP TRIGGERS
DROP TRIGGER IF EXISTS trg_solex_projects_updated_at ON public.solex_projects;
CREATE TRIGGER trg_solex_projects_updated_at
BEFORE UPDATE ON public.solex_projects
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_solex_units_updated_at ON public.solex_units;
CREATE TRIGGER trg_solex_units_updated_at
BEFORE UPDATE ON public.solex_units
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_solex_brokers_updated_at ON public.solex_brokers;
CREATE TRIGGER trg_solex_brokers_updated_at
BEFORE UPDATE ON public.solex_brokers
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_solex_leads_updated_at ON public.solex_leads;
CREATE TRIGGER trg_solex_leads_updated_at
BEFORE UPDATE ON public.solex_leads
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_solex_bookings_updated_at ON public.solex_bookings;
CREATE TRIGGER trg_solex_bookings_updated_at
BEFORE UPDATE ON public.solex_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 6. FULL REPLICA IDENTITY (Allows instant real-time change diffs)
ALTER TABLE public.solex_projects REPLICA IDENTITY FULL;
ALTER TABLE public.solex_units REPLICA IDENTITY FULL;
ALTER TABLE public.solex_brokers REPLICA IDENTITY FULL;
ALTER TABLE public.solex_leads REPLICA IDENTITY FULL;
ALTER TABLE public.solex_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.solex_activities REPLICA IDENTITY FULL;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.solex_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_activities ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon & authenticated web client access
DROP POLICY IF EXISTS "Allow all access to solex_projects" ON public.solex_projects;
CREATE POLICY "Allow all access to solex_projects" ON public.solex_projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to solex_units" ON public.solex_units;
CREATE POLICY "Allow all access to solex_units" ON public.solex_units FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to solex_brokers" ON public.solex_brokers;
CREATE POLICY "Allow all access to solex_brokers" ON public.solex_brokers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to solex_leads" ON public.solex_leads;
CREATE POLICY "Allow all access to solex_leads" ON public.solex_leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to solex_bookings" ON public.solex_bookings;
CREATE POLICY "Allow all access to solex_bookings" ON public.solex_bookings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to solex_activities" ON public.solex_activities;
CREATE POLICY "Allow all access to solex_activities" ON public.solex_activities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. GRANT PRIVILEGES TO POSTGREST ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 9. ENABLE SUPABASE REALTIME REPLICATION
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE 
        public.solex_projects, 
        public.solex_units, 
        public.solex_brokers, 
        public.solex_leads, 
        public.solex_bookings, 
        public.solex_activities;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
`;

export interface SupabaseSyncSnapshot {
  projects: Project[];
  units: PropertyUnit[];
  brokers: Broker[];
  leads: Lead[];
  bookings: BookingRecord[];
  activities: ActivityEvent[];
}

export async function fetchAndSyncFromSupabase(
  initialData: SupabaseSyncSnapshot
): Promise<{
  connected: boolean;
  tablesReady: boolean;
  data?: Partial<SupabaseSyncSnapshot>;
  message: string;
}> {
  try {
    const { data: projRows, error: projErr } = await supabase
      .from('solex_projects')
      .select('id,payload');

    if (projErr) {
      return {
        connected: true,
        tablesReady: false,
        message: projErr.message,
      };
    }

    if (!projRows || projRows.length === 0) {
      await seedAllTablesToSupabase(initialData);
      return {
        connected: true,
        tablesReady: true,
        data: initialData,
        message: 'Seeded initial soleX portfolio into Supabase PostgreSQL.',
      };
    }

    const [unitsRes, brokersRes, leadsRes, bookingsRes, activitiesRes] =
      await Promise.all([
        supabase.from('solex_units').select('id,payload'),
        supabase.from('solex_brokers').select('id,payload'),
        supabase.from('solex_leads').select('id,payload'),
        supabase.from('solex_bookings').select('id,payload'),
        supabase
          .from('solex_activities')
          .select('id,payload')
          .order('created_at', { ascending: false })
          .limit(35),
      ]);

    const projects = projRows.map((r: any) => r.payload as Project);
    const units = (unitsRes.data || []).map(
      (r: any) => r.payload as PropertyUnit
    );
    const brokers = (brokersRes.data || []).map(
      (r: any) => r.payload as Broker
    );
    const leads = (leadsRes.data || []).map((r: any) => r.payload as Lead);
    const bookings = (bookingsRes.data || []).map(
      (r: any) => r.payload as BookingRecord
    );
    const activities = (activitiesRes.data || []).map(
      (r: any) => r.payload as ActivityEvent
    );

    return {
      connected: true,
      tablesReady: true,
      data: {
        projects: projects.length ? projects : initialData.projects,
        units: units.length ? units : initialData.units,
        brokers: brokers.length ? brokers : initialData.brokers,
        leads: leads.length ? leads : initialData.leads,
        bookings: bookings.length ? bookings : initialData.bookings,
        activities: activities.length ? activities : initialData.activities,
      },
      message: 'Synchronized live state from Supabase PostgreSQL.',
    };
  } catch (err: any) {
    return {
      connected: false,
      tablesReady: false,
      message: err?.message || 'Unable to reach Supabase endpoint.',
    };
  }
}

export async function seedAllTablesToSupabase(
  snapshot: SupabaseSyncSnapshot
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: pErr } = await supabase.from('solex_projects').upsert(
      snapshot.projects.map((p) => ({
        id: p.id,
        payload: p,
        updated_at: new Date().toISOString(),
      }))
    );
    if (pErr) return { success: false, error: pErr.message };

    const { error: uErr } = await supabase.from('solex_units').upsert(
      snapshot.units.map((u) => ({
        id: u.id,
        project_id: u.projectId,
        status: u.status,
        version: u.version,
        payload: u,
        updated_at: new Date().toISOString(),
      }))
    );
    if (uErr) return { success: false, error: uErr.message };

    const { error: bErr } = await supabase.from('solex_brokers').upsert(
      snapshot.brokers.map((b) => ({
        id: b.id,
        payload: b,
        updated_at: new Date().toISOString(),
      }))
    );
    if (bErr) return { success: false, error: bErr.message };

    const { error: lErr } = await supabase.from('solex_leads').upsert(
      snapshot.leads.map((l) => ({
        id: l.id,
        project_id: l.projectId,
        assigned_broker_id: l.assignedBrokerId,
        stage: l.stage,
        payload: l,
        updated_at: new Date().toISOString(),
      }))
    );
    if (lErr) return { success: false, error: lErr.message };

    const { error: bkErr } = await supabase.from('solex_bookings').upsert(
      snapshot.bookings.map((bk) => ({
        id: bk.id,
        project_id: bk.projectId,
        unit_id: bk.unitId,
        broker_id: bk.brokerId,
        commission_status: bk.commissionStatus,
        payload: bk,
        updated_at: new Date().toISOString(),
      }))
    );
    if (bkErr) return { success: false, error: bkErr.message };

    const { error: aErr } = await supabase.from('solex_activities').upsert(
      snapshot.activities.map((a) => ({
        id: a.id,
        project_id: a.projectId,
        payload: a,
        created_at: new Date().toISOString(),
      }))
    );
    if (aErr) return { success: false, error: aErr.message };

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to seed Supabase tables.',
    };
  }
}

export async function upsertUnitInSupabase(unit: PropertyUnit) {
  try {
    await supabase.from('solex_units').upsert({
      id: unit.id,
      project_id: unit.projectId,
      status: unit.status,
      version: unit.version,
      payload: unit,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking background sync
  }
}

export async function upsertLeadInSupabase(lead: Lead) {
  try {
    await supabase.from('solex_leads').upsert({
      id: lead.id,
      project_id: lead.projectId,
      assigned_broker_id: lead.assignedBrokerId,
      stage: lead.stage,
      payload: lead,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking background sync
  }
}

export async function upsertBookingInSupabase(booking: BookingRecord) {
  try {
    await supabase.from('solex_bookings').upsert({
      id: booking.id,
      project_id: booking.projectId,
      unit_id: booking.unitId,
      broker_id: booking.brokerId,
      commission_status: booking.commissionStatus,
      payload: booking,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking background sync
  }
}

export async function insertActivityInSupabase(activity: ActivityEvent) {
  try {
    await supabase.from('solex_activities').upsert({
      id: activity.id,
      project_id: activity.projectId,
      payload: activity,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking background sync
  }
}
