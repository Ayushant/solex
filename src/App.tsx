import React, { useState, useEffect } from 'react';
import {
  useSolexStore,
  ScreenId,
  UserRole,
} from './store/useSolexStore';
import { CommandCentreView } from './components/CommandCentreView';
import { ProjectInventoryView } from './components/ProjectInventoryView';
import { LeadPipelineView } from './components/LeadPipelineView';
import {
  BrokerPortalView,
  BrokerCommissionsView,
  AdminBrokersDirectoryView,
  ArchitectureBlueprintView,
} from './components/BrokerPortalView';
import { UnitSlideOver } from './components/UnitSlideOver';
import { BookingWorkflowModal } from './components/BookingWorkflowModal';
import { DealCopilotDrawer } from './components/DealCopilotDrawer';
import { AuthLoginView } from './components/AuthLoginView';
import { SupabaseSchemaModal } from './components/SupabaseSchemaModal';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Wallet,
  FileCode2,
  Bot,
  Shield,
  CheckCircle2,
  X,
  ArrowRight,
  UserCheck,
  Menu,
  LogOut,
  Database,
} from 'lucide-react';

export default function App() {
  const {
    currentUser,
    logoutUser,
    role,
    setRole,
    activeBrokerId,
    brokers,
    activeScreen,
    setActiveScreen,
    setCopilotOpen,
    setSupabaseModalOpen,
    initializeFromSupabase,
    toast,
    dismissToast,
    units,
    bookings,
  } = useSolexStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      void initializeFromSupabase();
    }
  }, [currentUser, initializeFromSupabase]);

  // Show the Enterprise Login & Registration Portal when no user session is active
  if (!currentUser) {
    return <AuthLoginView />;
  }

  const activeBroker =
    brokers.find((b) => b.id === activeBrokerId) || brokers[0];

  const soldCount = units.filter((u) => u.status === 'Sold').length;
  const availableCount = units.filter((u) => u.status === 'Available').length;
  const pendingCommCount = bookings.filter(
    (b) => b.commissionStatus !== 'Released'
  ).length;

  const adminNavItems: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      id: 'command-centre',
      label: 'Command Centre',
      icon: LayoutDashboard,
    },
    {
      id: 'projects',
      label: 'Projects & Inventory',
      icon: Building2,
      badge: `${availableCount} Avail`,
    },
    {
      id: 'leads',
      label: 'Leads & Bookings',
      icon: Users,
    },
    {
      id: 'brokers',
      label: 'Brokers',
      icon: Briefcase,
    },
    {
      id: 'finance',
      label: 'Finance & Commissions',
      icon: Wallet,
      badge: `${pendingCommCount}`,
    },
    {
      id: 'architecture',
      label: 'ARCHITECTURE.md',
      icon: FileCode2,
    },
  ];

  const brokerNavItems: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'broker-leads',
      label: 'My Leads',
      icon: UserCheck,
    },
    {
      id: 'broker-commissions',
      label: 'My Commissions',
      icon: Wallet,
    },
  ];

  const currentNav = role === 'Admin' ? adminNavItems : brokerNavItems;

  const screenTitleMap: Record<ScreenId, string> = {
    'command-centre': 'Command Centre',
    projects: 'Projects & Inventory Matrix',
    leads: 'Lead-to-Booking Workflow',
    brokers: 'Channel Partner Network',
    finance: 'Finance & Commission Ledger',
    architecture: 'Production Architecture Blueprint',
    'broker-leads': 'Broker Portal / My Leads',
    'broker-commissions': 'Broker Portal / My Commissions',
  };

  const handleSelectNav = (id: ScreenId) => {
    setActiveScreen(id);
    setMobileMenuOpen(false);
  };

  const renderSidebarContents = (isMobileDrawer = false) => (
    <>
      <div>
        {/* Brand Lockup */}
        <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-display font-bold text-lg shrink-0">
              sX
            </div>
            <span className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap">
              soleX Mandate OS
            </span>
          </div>
          {isMobileDrawer && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Authenticated User & Role Context Indicator */}
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Signed in as {currentUser.fullName}
            </span>
            <span className="text-[10px] font-mono text-indigo-400">
              {role}
            </span>
          </div>
          <div className="text-xs font-semibold text-white mt-0.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              {role === 'Admin'
                ? 'Admin · Mandate HQ'
                : `Broker · ${activeBroker.name}`}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
            {currentUser.email}
          </div>
        </div>

        {/* Primary Navigation Links */}
        <nav className="p-3 space-y-1">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                {'badge' in item && item.badge && (
                  <span
                    className={`text-[11px] font-mono ${
                      isActive ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Cloud Database & Enterprise Scope Controls */}
        <div className="px-3 pt-3 mt-2 border-t border-slate-800/80 space-y-1">
          <button
            type="button"
            onClick={() => {
              setSupabaseModalOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Supabase DB & SQL</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400">Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void logoutUser();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Live Portfolio Summary */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span>Mandate Stock Sold</span>
          <span className="font-mono font-semibold text-white">
            {soldCount} / {units.length} Units
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${Math.round((soldCount / units.length) * 100)}%` }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Left Navigation Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col justify-between shrink-0 border-r border-slate-800">
        {renderSidebarContents(false)}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-slate-900 text-slate-300 h-full flex flex-col justify-between shadow-2xl overflow-y-auto">
            {renderSidebarContents(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6 shrink-0">
          {/* Left: Mobile Menu Button + Contextual Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 truncate">
              <span className="font-bold text-slate-900 font-display">soleX</span>
              <span>/</span>
              <span className="hidden md:inline">
                {role === 'Admin' ? 'Mandate Operations' : 'Channel Partner Portal'}
              </span>
              <span className="hidden md:inline">/</span>
              <span className="font-semibold text-indigo-600 truncate">
                {screenTitleMap[activeScreen]}
              </span>
            </div>
          </div>

          {/* Right: Role Switcher Dropdown + AI Deal Copilot CTA + Sign Out */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200">
              <label
                htmlFor="role-switcher-select"
                className="hidden sm:inline text-xs font-semibold text-slate-600 whitespace-nowrap"
              >
                Role Switcher:
              </label>
              <select
                id="role-switcher-select"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as UserRole);
                  setMobileMenuOpen(false);
                }}
                aria-label="Role Switcher"
                className="text-xs font-bold text-slate-900 bg-white px-2 sm:px-2.5 py-1 rounded-md border border-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Admin">Admin (Mandate HQ)</option>
                <option value="Broker">Broker (Partner)</option>
              </select>
            </div>

            {/* AI Deal Copilot Button */}
            <button
              type="button"
              onClick={() => setCopilotOpen(true)}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="hidden xs:inline sm:inline">Deal Copilot</span>
            </button>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={() => void logoutUser()}
              title={`Signed in as ${currentUser.fullName} (${currentUser.email}) — Click to Sign Out`}
              className="px-2.5 py-1.5 sm:py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Reactive Toast Notification Banner */}
        {toast && (
          <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-3.5 sm:p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">{toast.title}</div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {toast.description}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              {toast.actionLabel && toast.actionScreen && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen(toast.actionScreen!);
                    dismissToast();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>{toast.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={dismissToast}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Active Screen Viewport */}
        <main className="flex-1 p-3.5 sm:p-6 max-w-[1440px] w-full mx-auto">
          {role === 'Admin' ? (
            <>
              {activeScreen === 'command-centre' && <CommandCentreView />}
              {activeScreen === 'projects' && <ProjectInventoryView />}
              {activeScreen === 'leads' && <LeadPipelineView />}
              {activeScreen === 'brokers' && <AdminBrokersDirectoryView />}
              {activeScreen === 'finance' && <BrokerCommissionsView />}
              {activeScreen === 'architecture' && <ArchitectureBlueprintView />}
            </>
          ) : (
            <BrokerPortalView
              subScreen={
                activeScreen === 'broker-commissions' ? 'commissions' : 'leads'
              }
            />
          )}
        </main>
      </div>

      {/* Global Connected Slide-Overs & Modals */}
      <UnitSlideOver />
      <BookingWorkflowModal />
      <DealCopilotDrawer />
      <SupabaseSchemaModal />
    </div>
  );
}
