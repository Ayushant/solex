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
-- soleX Mandate OS — Production & Prototype Schema for Supabase PostgreSQL
-- Target Project: https://udnnkhhamdzgdtmufwdk.supabase.co
-- Run this script in your Supabase SQL Editor to enable full cloud table sync
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.solex_projects (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solex_units (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solex_brokers (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solex_leads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  assigned_broker_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solex_bookings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  broker_id TEXT NOT NULL,
  commission_status TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solex_activities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) with open policies for evaluation prototype
ALTER TABLE public.solex_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solex_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write solex_projects" ON public.solex_projects;
CREATE POLICY "Allow public read/write solex_projects" ON public.solex_projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write solex_units" ON public.solex_units;
CREATE POLICY "Allow public read/write solex_units" ON public.solex_units FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write solex_brokers" ON public.solex_brokers;
CREATE POLICY "Allow public read/write solex_brokers" ON public.solex_brokers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write solex_leads" ON public.solex_leads;
CREATE POLICY "Allow public read/write solex_leads" ON public.solex_leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write solex_bookings" ON public.solex_bookings;
CREATE POLICY "Allow public read/write solex_bookings" ON public.solex_bookings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write solex_activities" ON public.solex_activities;
CREATE POLICY "Allow public read/write solex_activities" ON public.solex_activities FOR ALL USING (true) WITH CHECK (true);
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
