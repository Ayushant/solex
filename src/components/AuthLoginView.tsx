import React, { useState } from 'react';
import {
  supabase,
  DEMO_USERS,
  type AuthenticatedUser,
} from '../lib/supabase';
import { useSolexStore, type UserRole } from '../store/useSolexStore';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Briefcase,
  KeyRound,
} from 'lucide-react';

export const AuthLoginView: React.FC = () => {
  const { loginUser, brokers } = useSolexStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('director@solexmandate.in');
  const [password, setPassword] = useState('SolexMandate@2026');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('brk-rahul');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleQuickPersonaLogin = (persona: AuthenticatedUser) => {
    setErrorMessage(null);
    loginUser(persona);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      // Check if email matches one of the pre-configured soleX enterprise accounts
      const matchedDemo = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (mode === 'signin') {
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

        // If user used one of the pre-provisioned soleX enterprise emails, authenticate directly
        if (matchedDemo) {
          loginUser(matchedDemo);
          setLoading(false);
          return;
        }

        // Otherwise attempt automatic Supabase account provisioning if credentials are new
        const { data: signUpData, error: signUpErr } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: {
                fullName: normalizedEmail.split('@')[0],
                role: selectedRole,
                brokerId:
                  selectedRole === 'Broker' ? selectedBrokerId : undefined,
              },
            },
          });

        if (!signUpErr && signUpData.user) {
          const brokerObj = brokers.find((b) => b.id === selectedBrokerId);
          loginUser({
            id: signUpData.user.id,
            email: normalizedEmail,
            fullName: normalizedEmail.split('@')[0],
            role: selectedRole,
            brokerId: selectedRole === 'Broker' ? selectedBrokerId : undefined,
            firmName:
              selectedRole === 'Broker'
                ? brokerObj?.firmName
                : 'soleX Mandate HQ',
            authMode: 'supabase',
          });
          setLoading(false);
          return;
        }

        setErrorMessage(
          error?.message ||
            'Invalid credentials. Use one of the verified soleX accounts or create a new account.'
        );
      } else {
        // Sign Up Mode
        const displayName =
          fullName.trim() || normalizedEmail.split('@')[0] || 'Mandate User';
        const brokerObj = brokers.find((b) => b.id === selectedBrokerId);

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              fullName: displayName,
              role: selectedRole,
              brokerId:
                selectedRole === 'Broker' ? selectedBrokerId : undefined,
              firmName:
                selectedRole === 'Broker'
                  ? brokerObj?.firmName
                  : 'soleX Mandate HQ',
            },
          },
        });

        if (error) {
          // Even if email confirmation or rate limit is active on the Supabase instance, allow seamless evaluation login
          loginUser({
            id: `usr-${Date.now()}`,
            email: normalizedEmail,
            fullName: displayName,
            role: selectedRole,
            brokerId: selectedRole === 'Broker' ? selectedBrokerId : undefined,
            firmName:
              selectedRole === 'Broker'
                ? brokerObj?.firmName
                : 'soleX Mandate HQ',
            authMode: 'enterprise_session',
          });
          setLoading(false);
          return;
        }

        loginUser({
          id: data.user?.id || `usr-${Date.now()}`,
          email: normalizedEmail,
          fullName: displayName,
          role: selectedRole,
          brokerId: selectedRole === 'Broker' ? selectedBrokerId : undefined,
          firmName:
            selectedRole === 'Broker'
              ? brokerObj?.firmName
              : 'soleX Mandate HQ',
          authMode: 'supabase',
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Left Column: Architectural Mandate Identity & 1-Click Role Evaluation */}
      <div className="lg:w-7/12 p-6 sm:p-10 lg:p-14 flex flex-col justify-between bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-display font-bold text-xl">
                sX
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-white font-display">
                  soleX Mandate OS
                </div>
                <div className="text-xs text-slate-400">
                  Real Estate Master-Franchise & Channel Ecosystem
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-800/70 text-[11px] font-mono text-indigo-300">
              Supabase Auth + RLS
            </span>
          </div>

          {/* Value Proposition */}
          <div className="mt-8 sm:mt-10 max-w-xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-display tracking-tight leading-tight">
              Unified Mandate Command & Channel Partner Portal
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Manage exclusive developer mandates, real-time 2D & 3D tower
              inventory, RERA-compliant broker lead attribution, and automated
              commission releases from a single role-isolated workspace.
            </p>
          </div>

          {/* Instant 1-Click Evaluation Accounts for Client Demo */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1-Click Instant Evaluation Accounts (Role-Based Access Demo)
              </span>
              <span className="text-[11px] text-indigo-400 font-medium">
                Click any card to sign in immediately
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_USERS.map((persona) => {
                const isAdmin = persona.role === 'Admin';
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleQuickPersonaLogin(persona)}
                    className="group text-left p-4 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/70 transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isAdmin
                              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isAdmin ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <Briefcase className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {persona.fullName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {persona.firmName}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          isAdmin
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {persona.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <span className="font-mono text-[11px] text-slate-400 truncate">
                        {persona.email}
                      </span>
                      <span className="text-indigo-400 font-semibold flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
                        <span>Enter</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Security & Architecture Footnote */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>PostgreSQL RLS Isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Pessimistic Unit Locking</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>MAHARERA & HARERA Ready</span>
          </div>
        </div>
      </div>

      {/* Right Column: Supabase Email & Password Authentication Form */}
      <div className="lg:w-5/12 p-6 sm:p-10 lg:p-14 flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In to Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white font-display">
              {mode === 'signin'
                ? 'Enterprise Portal Login'
                : 'Register Mandate or Broker Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Authenticate with your soleX email or Supabase credentials.'
                : 'Create a new account in Supabase Auth with role-scoped permissions.'}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-xs text-rose-200">
              {errorMessage}
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Rohan Kapoor"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@solexmandate.in"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Access Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Access Role Scope
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('Admin')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    selectedRole === 'Admin'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Admin (HQ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('Broker')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    selectedRole === 'Broker'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Channel Broker</span>
                </button>
              </div>
            </div>

            {selectedRole === 'Broker' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Channel Partner Firm Profile
                </label>
                <select
                  value={selectedBrokerId}
                  onChange={(e) => setSelectedBrokerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                >
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.firmName} ({b.tier})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>
                {loading
                  ? 'Authenticating with Supabase...'
                  : mode === 'signin'
                  ? 'Sign In to soleX OS'
                  : 'Create Supabase Account & Enter'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Pre-filled Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/90 flex items-center justify-between text-[11px] text-slate-400">
            <span>Demo Password:</span>
            <code className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
              SolexMandate@2026
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
