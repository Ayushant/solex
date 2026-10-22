import React, { useState } from 'react';
import {
  supabase,
  DEMO_USERS,
  type AuthenticatedUser,
} from '../lib/supabase';
import { useSolexStore, type UserRole } from '../store/useSolexStore';
import { X } from 'lucide-react';

export const AuthLoginView: React.FC = () => {
  const { loginUser, brokers } = useSolexStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const handleDemoSelect = (persona: AuthenticatedUser) => {
    setDemoDialogOpen(false);
    setErrorMessage(null);
    loginUser(persona);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setErrorMessage('Enter your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const matchedDemo = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data.user) {
        const meta = data.user.user_metadata || {};
        const role: UserRole =
          meta.role === 'Broker' ? 'Broker' : matchedDemo?.role || 'Admin';
        const brokerId =
          meta.brokerId || matchedDemo?.brokerId || 'brk-rahul';
        const brokerObj = brokers.find((b) => b.id === brokerId);

        loginUser({
          id: data.user.id,
          email: data.user.email || normalizedEmail,
          fullName:
            meta.fullName ||
            matchedDemo?.fullName ||
            normalizedEmail.split('@')[0],
          role,
          brokerId: role === 'Broker' ? brokerId : undefined,
          firmName:
            role === 'Broker'
              ? brokerObj?.firmName || 'Channel Partner'
              : 'soleX Mandate HQ',
          authMode: 'supabase',
        });
        setLoading(false);
        return;
      }

      if (matchedDemo) {
        loginUser(matchedDemo);
        setLoading(false);
        return;
      }

      const inferredRole: UserRole = normalizedEmail.includes('broker')
        ? 'Broker'
        : 'Admin';
      const { data: signUpData, error: signUpErr } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              fullName: normalizedEmail.split('@')[0],
              role: inferredRole,
            },
          },
        });

      if (!signUpErr && signUpData.user) {
        loginUser({
          id: signUpData.user.id,
          email: normalizedEmail,
          fullName: normalizedEmail.split('@')[0],
          role: inferredRole,
          brokerId: inferredRole === 'Broker' ? 'brk-rahul' : undefined,
          firmName:
            inferredRole === 'Broker'
              ? 'Apex Realty Advisors'
              : 'soleX Mandate HQ',
          authMode: 'supabase',
        });
        setLoading(false);
        return;
      }

      setErrorMessage(
        error?.message ||
          'Could not verify credentials. Check your email or try the demo.'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[var(--subtle)] text-[var(--text-primary)]">
      {/* Left 40% (5/12): Eclipse 950 panel with ivory soleX wordmark, one Fraunces line of positioning, and the ink-wash texture */}
      <aside className="lg:col-span-5 ink-wash-eclipse-panel p-8 sm:p-12 flex flex-col justify-between text-[#E4E4F2]">
        <div className="flex items-center gap-2">
          <span
            className="w-[6px] h-[6px] rotate-45 shrink-0"
            style={{ backgroundColor: '#8686AC' }}
            aria-hidden="true"
          />
          <span
            className="text-[15px] leading-[20px] font-semibold tracking-tight"
            style={{ color: '#FFFFE3' }}
          >
            soleX
          </span>
        </div>

        <div className="my-12 lg:my-0 max-w-md">
          <h1
            className="font-serif-title text-[26px] sm:text-[30px] leading-[38px] font-semibold tracking-tight"
            style={{ color: '#FFFFE3', textWrap: 'balance' }}
          >
            Architectural inventory, buyer allotment, and channel settlements in one ledger.
          </h1>
        </div>

        <div className="t-12 font-mono" style={{ color: '#8686AC' }}>
          soleX Mandate Operating System
        </div>
      </aside>

      {/* Right 60% (7/12): On Paper 25, a 360px form */}
      <main className="lg:col-span-7 bg-[var(--subtle)] flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[360px]">
          <div className="mb-6">
            <h2 className="t-22-title text-[var(--text-primary)]">Sign in</h2>
            <p className="t-13 text-[var(--text-secondary)] mt-1">
              Enter your mandate desk or channel partner credentials.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 px-3 py-2 rounded-[6px] border t-12"
              style={{
                backgroundColor: 'var(--status-blocked-tint)',
                borderColor: 'var(--status-blocked-border)',
                color: 'var(--status-blocked)',
              }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="signin-email"
                className="block t-12 text-[var(--text-primary)] mb-1.5"
              >
                Email
              </label>
              <input
                id="signin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.in"
                className="input-control"
              />
            </div>

            <div>
              <label
                htmlFor="signin-password"
                className="block t-12 text-[var(--text-primary)] mb-1.5"
              >
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-control"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between t-12 text-[var(--text-tertiary)]">
            <span>Evaluation workspace</span>
            <button
              type="button"
              onClick={() => setDemoDialogOpen(true)}
              className="text-[var(--accent)] hover:underline cursor-pointer font-medium"
            >
              Try the demo
            </button>
          </div>
        </div>
      </main>

      {/* Quiet Demo Role Selection Dialog (480px, no passwords displayed) */}
      {demoDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 14, 71, 0.35)' }}
          onClick={() => setDemoDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Select a demo workspace role"
            className="w-full max-w-[480px] bg-[var(--surface)] border border-[var(--border)] rounded-[10px] shadow-eclipse overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="t-14-medium text-[var(--text-primary)]">
                Select a demo role
              </span>
              <button
                type="button"
                onClick={() => setDemoDialogOpen(false)}
                className="btn-ghost btn-sm px-1.5"
                aria-label="Close demo dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {DEMO_USERS.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => handleDemoSelect(persona)}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--subtle)] transition-colors flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div>
                    <div className="t-13-medium text-[var(--text-primary)]">
                      {persona.fullName}
                    </div>
                    <div className="t-12 text-[var(--text-secondary)] mt-0.5">
                      {persona.firmName}
                    </div>
                  </div>
                  <span className="t-12 font-mono text-[var(--text-tertiary)]">
                    {persona.role === 'Admin'
                      ? 'Mandate admin'
                      : 'Channel partner'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
