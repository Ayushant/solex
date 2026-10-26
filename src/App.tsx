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
import { SupabaseSchemaModal } from './components/SupabaseSchemaModal';
import { AuthLoginView } from './components/AuthLoginView';
import { formatInr } from './lib/formatters';
import {
  LayoutGrid,
  Building2,
  Users,
  Briefcase,
  Receipt,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  Code2,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export default function App() {
  const {
    currentUser,
    logoutUser,
    role,
    setRole,
    activeBrokerId,
    setActiveBrokerId,
    brokers,
    activeScreen,
    setActiveScreen,
    setCopilotOpen,
    setSupabaseModalOpen,
    initializeFromSupabase,
    toast,
    dismissToast,
    units,
    leads,
    bookings,
    projects,
    setSelectedProjectId,
    setSelectedUnitId,
  } = useSolexStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark')
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Developer-only flag (?dev=1 in URL) hides ARCHITECTURE.md and Supabase SQL by default
  const [devMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('dev') === '1';
  });

  useEffect(() => {
    if (currentUser) {
      void initializeFromSupabase();
    }
  }, [currentUser, initializeFromSupabase]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      dismissToast();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  // Global ⌘K / Ctrl+K shortcut for search palette & ⌘B / Ctrl+B for sidebar toggle
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCommandOpen(false);
        setNotificationsOpen(false);
        setAvatarMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  if (!currentUser) {
    return <AuthLoginView />;
  }

  const activeBroker =
    brokers.find((b) => b.id === activeBrokerId) || brokers[0];

  const availableCount = units.filter((u) => u.status === 'Available').length;
  const activeLeadsCount =
    role === 'Broker'
      ? leads.filter(
          (l) =>
            l.assignedBrokerId === activeBroker.id && l.stage !== 'Booked'
        ).length
      : leads.filter((l) => l.stage !== 'Booked').length;
  const pendingCommCount =
    role === 'Broker'
      ? bookings.filter(
          (b) =>
            b.brokerId === activeBroker.id &&
            b.commissionStatus !== 'Released'
        ).length
      : bookings.filter((b) => b.commissionStatus !== 'Released').length;

  const workspaceItems: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] =
    role === 'Admin'
      ? [
          {
            id: 'command-centre',
            label: 'Overview',
            icon: LayoutGrid,
          },
          {
            id: 'projects',
            label: 'Inventory',
            icon: Building2,
            count: availableCount,
          },
          {
            id: 'leads',
            label: 'Leads',
            icon: Users,
            count: activeLeadsCount,
          },
          {
            id: 'brokers',
            label: 'Brokers',
            icon: Briefcase,
            count: brokers.length,
          },
        ]
      : [
          {
            id: 'command-centre',
            label: 'Overview',
            icon: LayoutGrid,
          },
          {
            id: 'projects',
            label: 'Inventory',
            icon: Building2,
            count: availableCount,
          },
          {
            id: 'broker-leads',
            label: 'Leads',
            icon: Users,
            count: activeLeadsCount,
          },
        ];

  const financeItems: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] =
    role === 'Admin'
      ? [
          {
            id: 'finance',
            label: 'Payouts',
            icon: Receipt,
            count: pendingCommCount,
          },
        ]
      : [
          {
            id: 'broker-commissions',
            label: 'Payouts',
            icon: Receipt,
            count: pendingCommCount,
          },
        ];

  const screenTitleMap: Record<ScreenId, string> = {
    'command-centre': 'Overview',
    projects: 'Inventory',
    leads: 'Leads',
    brokers: 'Brokers',
    finance: 'Payouts',
    architecture: 'Architecture',
    'broker-leads': 'Leads',
    'broker-commissions': 'Payouts',
  };

  const handleSelectNav = (id: ScreenId) => {
    setActiveScreen(id);
    setMobileMenuOpen(false);
  };

  const heldUnits = units.filter((u) => u.status === 'Hold');
  const pendingInvoices = bookings.filter(
    (b) => b.commissionStatus === 'Pending Approval'
  );

  const q = commandQuery.trim().toLowerCase();
  const matchedUnits = q
    ? units
        .filter(
          (u) =>
            u.unitNumber.toLowerCase().includes(q) ||
            u.bhk.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];
  const matchedLeads = q
    ? leads
        .filter(
          (l) =>
            l.buyerName.toLowerCase().includes(q) ||
            l.phone.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const renderSidebarContents = (isMobileDrawer = false) => (
    <div
      className="h-full flex flex-col justify-between select-none"
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)',
      }}
    >
      <div>
        {/* Brand Header: 52px height aligned with top bar, "soleX" wordmark in 15/600 ivory with a small dusk diamond */}
        <div
          className="h-[52px] px-4 flex items-center justify-between border-b"
          style={{ borderColor: 'rgba(134, 134, 172, 0.16)' }}
        >
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
          <button
            type="button"
            onClick={() => {
              if (isMobileDrawer) {
                setMobileMenuOpen(false);
              } else {
                setSidebarOpen(false);
              }
            }}
            title={isMobileDrawer ? 'Close navigation menu' : 'Collapse sidebar (⌘B)'}
            className="p-1.5 rounded-[6px] text-[#8686AC] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
            aria-label={isMobileDrawer ? 'Close navigation drawer' : 'Collapse sidebar'}
          >
            {isMobileDrawer ? (
              <X className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="p-3 space-y-5">
          {/* Group: Workspace */}
          <div>
            <div
              className="px-2.5 pb-1.5 t-12"
              style={{ color: 'var(--sidebar-muted)' }}
            >
              Workspace
            </div>
            <nav className="space-y-0.5" aria-label="Workspace navigation">
              {workspaceItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    style={{
                      backgroundColor: isActive
                        ? 'var(--sidebar-active)'
                        : undefined,
                      color: isActive ? '#FFFFFF' : 'var(--sidebar-text)',
                    }}
                    className={`relative w-full h-8 px-2.5 rounded-[6px] flex items-center justify-between text-[13px] leading-[20px] transition-colors cursor-pointer ${
                      isActive
                        ? 'font-medium'
                        : 'hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r"
                        style={{ backgroundColor: '#FFFFE3' }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#FFFFE3]' : 'text-[#8686AC]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && (
                      <span
                        className="t-12 font-mono tabular-nums"
                        style={{ color: '#8686AC' }}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group: Finance */}
          <div>
            <div
              className="px-2.5 pb-1.5 t-12"
              style={{ color: 'var(--sidebar-muted)' }}
            >
              Finance
            </div>
            <nav className="space-y-0.5" aria-label="Finance navigation">
              {financeItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    style={{
                      backgroundColor: isActive
                        ? 'var(--sidebar-active)'
                        : undefined,
                      color: isActive ? '#FFFFFF' : 'var(--sidebar-text)',
                    }}
                    className={`relative w-full h-8 px-2.5 rounded-[6px] flex items-center justify-between text-[13px] leading-[20px] transition-colors cursor-pointer ${
                      isActive
                        ? 'font-medium'
                        : 'hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r"
                        style={{ backgroundColor: '#FFFFE3' }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#FFFFE3]' : 'text-[#8686AC]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && (
                      <span
                        className="t-12 font-mono tabular-nums"
                        style={{ color: '#8686AC' }}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Developer-only tools (hidden unless ?dev=1) */}
          {devMode && (
            <div>
              <div
                className="px-2.5 pb-1.5 t-12"
                style={{ color: 'var(--sidebar-muted)' }}
              >
                Developer
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectNav('architecture')}
                  className="w-full h-8 px-2.5 rounded-[6px] flex items-center gap-2.5 text-[13px] hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
                >
                  <Code2 className="w-4 h-4 shrink-0 text-[#8686AC]" />
                  <span>ARCHITECTURE.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSupabaseModalOpen(true)}
                  className="w-full h-8 px-2.5 rounded-[6px] flex items-center gap-2.5 text-[13px] hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4 shrink-0 text-[#8686AC]" />
                  <span>Supabase DB & SQL</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom User Card + Always-Visible Role Switcher & Sign Out */}
      <div
        className="p-3 border-t space-y-2"
        style={{ borderColor: 'rgba(134, 134, 172, 0.16)' }}
      >
        <div
          className="px-2 pb-2.5 border-b space-y-1"
          style={{ borderColor: 'rgba(134, 134, 172, 0.16)' }}
        >
          <div
            className="t-12 pb-1 flex items-center justify-between"
            style={{ color: '#FFFFE3' }}
          >
            <span className="font-semibold tracking-wide uppercase text-[11px]">
              View as (Switch Role)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setRole('Admin' as UserRole);
              setMobileMenuOpen(false);
            }}
            className={`w-full px-2.5 py-1.5 rounded-[6px] text-left t-12 flex items-center justify-between cursor-pointer transition-colors ${
              role === 'Admin'
                ? 'bg-[#FFFFE3] text-[#0F0E47] font-semibold'
                : 'text-[#E4E4F2] hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            <span>Mandate HQ (Admin)</span>
            {role === 'Admin' && <span>●</span>}
          </button>
          {brokers.map((brk) => {
            const active = role === 'Broker' && activeBrokerId === brk.id;
            return (
              <button
                key={brk.id}
                type="button"
                onClick={() => {
                  setActiveBrokerId(brk.id);
                  setRole('Broker' as UserRole);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-[6px] text-left t-12 flex items-center justify-between cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#FFFFE3] text-[#0F0E47] font-semibold'
                    : 'text-[#E4E4F2] hover:bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                <span className="truncate">Broker · {brk.name}</span>
                {active && <span>●</span>}
              </button>
            );
          })}
        </div>

        <div className="px-2 py-1.5 rounded-[6px] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="t-13-medium text-white truncate">
              {role === 'Broker' ? activeBroker.name : currentUser.fullName}
            </div>
            <div
              className="t-12 truncate"
              style={{ color: 'var(--sidebar-muted)' }}
            >
              {role === 'Admin'
                ? 'Mandate HQ · Admin'
                : `${activeBroker.firmName} · Broker`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              void logoutUser();
            }}
            className="px-2 py-1 rounded-[6px] t-12 text-[#FCA5A5] hover:bg-[rgba(255,255,255,0.06)] shrink-0 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  const mobileBottomNavItems = workspaceItems.concat(financeItems);

  return (
    <div
      className="min-h-screen flex bg-[var(--bg)] text-[var(--text-primary)]"
      onClick={() => {
        if (notificationsOpen) setNotificationsOpen(false);
      }}
    >
      {/* Desktop / Laptop Sidebar: 240px Eclipse 950 (collapsible) */}
      {sidebarOpen && (
        <aside className="hidden lg:block w-[240px] shrink-0 sticky top-0 h-screen overflow-y-auto">
          {renderSidebarContents(false)}
        </aside>
      )}

      {/* Under 1024px: Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="drawer-enter relative z-10 w-[264px] max-w-[82vw] h-full shadow-eclipse overflow-y-auto">
            {renderSidebarContents(true)}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Bar: 56px */}
        <header className="sticky top-0 z-30 h-[56px] px-3 sm:px-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-2 sm:gap-4 shrink-0">
          {/* Left: Sidebar Toggle & Breadcrumb */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Mobile (<1024px) drawer button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden btn-ghost btn-sm px-2 -ml-1 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Laptop / Desktop (>=1024px) sidebar collapse/expand toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              title={sidebarOpen ? 'Hide sidebar (⌘B)' : 'Show sidebar (⌘B)'}
              className="hidden lg:inline-flex btn-ghost btn-sm px-2 -ml-1.5 shrink-0 text-[var(--icon-muted)] hover:text-[var(--text-primary)]"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 t-13 min-w-0 truncate"
            >
              <span className="hidden xs:inline sm:inline text-[var(--text-tertiary)] truncate max-w-[110px] sm:max-w-none">
                {role === 'Admin' ? 'Workspace' : activeBroker.firmName}
              </span>
              <span className="hidden xs:inline sm:inline text-[var(--text-tertiary)]">
                /
              </span>
              <span className="font-medium text-[var(--text-primary)] truncate">
                {screenTitleMap[activeScreen]}
              </span>
            </nav>
          </div>

          {/* Right: Search (⌘K), Notifications, Copilot, Theme toggle, BIG Role Switcher Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Search (⌘K) */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="h-9 px-2.5 sm:px-3 rounded-[6px] border border-[var(--border)] bg-[var(--subtle)] hover:border-[var(--border-strong)] t-12 text-[var(--text-secondary)] flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              aria-label="Search (Command+K)"
            >
              <Search className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden lg:inline t-mono text-[11px] text-[var(--text-tertiary)]">
                ⌘K
              </kbd>
            </button>

            {/* Notifications (Eclipse 600 dot) */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                }}
                className="btn-ghost btn-sm px-2 relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[var(--icon-muted)]" />
                {(heldUnits.length > 0 || pendingInvoices.length > 0) && (
                  <span
                    className="w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5"
                    style={{ backgroundColor: '#505081' }}
                  />
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 z-40 sm:w-80 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-eclipse py-2 divide-y divide-[var(--border)]">
                  <div className="px-3 pb-1.5 t-12 text-[var(--text-tertiary)] flex items-center justify-between">
                    <span>Notifications</span>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="sm:hidden text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      aria-label="Close notifications"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {heldUnits.slice(0, 3).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          setSelectedProjectId(u.projectId);
                          setActiveScreen('projects');
                          setSelectedUnitId(u.id);
                        }}
                        className="w-full px-3 py-2.5 sm:py-2 text-left hover:bg-[var(--subtle)] t-12 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="text-[var(--text-primary)]">
                          Unit <span className="t-mono">{u.unitNumber}</span>{' '}
                          hold active
                        </span>
                        <span className="t-mono text-[var(--status-hold)] shrink-0">
                          24h hold
                        </span>
                      </button>
                    ))}
                    {pendingInvoices.slice(0, 3).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          setActiveScreen(
                            role === 'Admin' ? 'finance' : 'broker-commissions'
                          );
                        }}
                        className="w-full px-3 py-2.5 sm:py-2 text-left hover:bg-[var(--subtle)] t-12 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="text-[var(--text-primary)]">
                          Invoice awaiting approval
                        </span>
                        <span className="t-mono text-[var(--text-primary)] shrink-0">
                          {formatInr(b.commissionAmountInr)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Copilot ghost button */}
            <button
              type="button"
              onClick={() => setCopilotOpen(true)}
              className="btn-ghost btn-sm px-2 sm:px-2.5"
            >
              Copilot
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-ghost btn-sm px-2"
              aria-label={
                isDark ? 'Switch to light theme' : 'Switch to dark theme'
              }
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[var(--icon-muted)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--icon-muted)]" />
              )}
            </button>

            {/* BIG Prominent "View As / Switch Role" Button (Opens Large Role Switcher Popup) */}
            <button
              type="button"
              onClick={() => {
                setAvatarMenuOpen(true);
                setNotificationsOpen(false);
              }}
              aria-label="Switch View Role"
              className="h-9 px-3 sm:px-4 rounded-[8px] bg-[#272757] hover:bg-[#1B1A4E] text-[#FFFFE3] border border-[#505081] shadow-sm flex items-center gap-2 text-[13px] font-semibold cursor-pointer transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-[#2E7D5B] ring-2 ring-[#FFFFE3]/30 shrink-0" />
              <span className="hidden sm:inline text-[#C6C6DF] font-normal">
                View as:
              </span>
              <span className="truncate max-w-[140px] sm:max-w-[190px]">
                {role === 'Admin'
                  ? 'Mandate HQ (Admin)'
                  : `Broker · ${activeBroker.name}`}
              </span>
              <ChevronDown className="w-4 h-4 text-[#FFFFE3] shrink-0" />
            </button>
          </div>
        </header>

        {/* Prominent Top Role Switcher Bar (Always visible so client immediately sees all roles they can switch to) */}
        <div className="bg-[#0F0E47] text-[#FFFFE3] border-b border-[#3A3A6B] px-3 sm:px-6 py-2.5">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-[4px] bg-[#505081] text-[#FFFFE3] text-[11px] font-mono font-semibold uppercase tracking-wider shrink-0">
                  View As
                </span>
                <span className="text-[13px] font-medium text-white truncate">
                  {role === 'Admin'
                    ? `${currentUser.fullName} (${currentUser.email})`
                    : `${activeBroker.name} (${activeBroker.name.toLowerCase().replace(/\s+/g, '.')}@apexrealty.in)`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAvatarMenuOpen(true)}
                className="md:hidden px-2.5 py-1 rounded-[6px] bg-[#FFFFE3] text-[#0F0E47] text-[12px] font-semibold shrink-0 cursor-pointer"
              >
                Switch Role ▾
              </button>
            </div>

            {/* One-Click Big Role Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 md:pb-0">
              <button
                type="button"
                onClick={() => setRole('Admin' as UserRole)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] sm:text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                  role === 'Admin'
                    ? 'bg-[#FFFFE3] text-[#0F0E47] font-semibold shadow-sm'
                    : 'bg-[#1B1A4E] text-[#E4E4F2] border border-[#3A3A6B] hover:bg-[#272757]'
                }`}
              >
                <span>Mandate HQ (Admin)</span>
                {role === 'Admin' && <span className="text-[#2E7D5B]">●</span>}
              </button>

              {brokers.map((brk) => {
                const active = role === 'Broker' && activeBrokerId === brk.id;
                return (
                  <button
                    key={brk.id}
                    type="button"
                    onClick={() => {
                      setActiveBrokerId(brk.id);
                      setRole('Broker' as UserRole);
                    }}
                    className={`px-3 py-1.5 rounded-[6px] text-[12px] sm:text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                      active
                        ? 'bg-[#FFFFE3] text-[#0F0E47] font-semibold shadow-sm'
                        : 'bg-[#1B1A4E] text-[#E4E4F2] border border-[#3A3A6B] hover:bg-[#272757]'
                    }`}
                  >
                    <span>Broker · {brk.name}</span>
                    {active && <span className="text-[#2E7D5B]">●</span>}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setAvatarMenuOpen(true)}
                className="px-2.5 py-1.5 rounded-[6px] text-[12px] font-medium bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.16)] text-[#C6C6DF] shrink-0 cursor-pointer"
              >
                Account & Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Big Centered Popup Modal for Role Switcher ("View as") */}
        {avatarMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setAvatarMenuOpen(false)}
            />
            <div
              role="dialog"
              aria-label="Switch Role and Account"
              className="relative z-10 w-full max-w-[460px] rounded-[12px] bg-[var(--surface)] border-2 border-[var(--accent)] shadow-eclipse overflow-hidden"
            >
              {/* Modal Header: Active User Info */}
              <div className="px-5 py-4 bg-[#0F0E47] text-[#FFFFE3] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#A6A6C8]">
                    Active Session
                  </div>
                  <div className="text-[18px] font-semibold text-white truncate mt-0.5">
                    {role === 'Broker' ? activeBroker.name : currentUser.fullName}
                  </div>
                  <div className="t-mono text-[13px] text-[#C6C6DF] truncate">
                    {role === 'Broker'
                      ? `${activeBroker.name.toLowerCase().replace(/\s+/g, '.')}@apexrealty.in`
                      : currentUser.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen(false)}
                  className="p-1.5 rounded-[6px] text-[#A6A6C8] hover:text-white hover:bg-white/10 cursor-pointer"
                  aria-label="Close role switcher"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* View As List */}
              <div className="p-5 space-y-2.5">
                <div className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  View as (Select Role to Preview)
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRole('Admin' as UserRole);
                    setAvatarMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-[8px] border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    role === 'Admin'
                      ? 'border-[#272757] bg-[#F1F1F8] dark:bg-[#1B1A4E] text-[var(--text-primary)] font-semibold shadow-sm'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--subtle)] text-[var(--text-primary)]'
                  }`}
                >
                  <div>
                    <div className="text-[15px] font-semibold">
                      Mandate HQ (Admin)
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)]">
                      Full command centre · All projects, leads, inventory & commission approvals
                    </div>
                  </div>
                  {role === 'Admin' && (
                    <span className="text-[18px] text-[#2E7D5B] shrink-0">●</span>
                  )}
                </button>

                {brokers.map((brk) => {
                  const active = role === 'Broker' && activeBrokerId === brk.id;
                  return (
                    <button
                      key={brk.id}
                      type="button"
                      onClick={() => {
                        setActiveBrokerId(brk.id);
                        setRole('Broker' as UserRole);
                        setAvatarMenuOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-[8px] border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        active
                          ? 'border-[#272757] bg-[#F1F1F8] dark:bg-[#1B1A4E] text-[var(--text-primary)] font-semibold shadow-sm'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--subtle)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold truncate">
                          Broker · {brk.name}
                        </div>
                        <div className="text-[12px] text-[var(--text-secondary)] truncate">
                          {brk.firmName} · {brk.tier} Channel Partner ({brk.reraId})
                        </div>
                      </div>
                      {active && (
                        <span className="text-[18px] text-[#2E7D5B] shrink-0">●</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer: Sign Out */}
              <div className="px-5 py-3.5 bg-[var(--subtle)] border-t border-[var(--border)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarMenuOpen(false);
                    void logoutUser();
                  }}
                  className="px-4 py-2 rounded-[6px] bg-[#A33A2E] hover:opacity-90 text-white text-[13px] font-semibold cursor-pointer"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen(false)}
                  className="btn-secondary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Screen Viewport */}
        <main className="flex-1 p-3.5 sm:p-6 max-w-[1440px] w-full mx-auto">
          {role === 'Admin' ? (
            <>
              {activeScreen === 'command-centre' && <CommandCentreView />}
              {activeScreen === 'architecture' && (
                <ArchitectureBlueprintView />
              )}
              {activeScreen === 'projects' && <ProjectInventoryView />}
              {activeScreen === 'leads' && <LeadPipelineView />}
              {activeScreen === 'brokers' && <AdminBrokersDirectoryView />}
              {activeScreen === 'finance' && <BrokerCommissionsView />}
            </>
          ) : (
            <>
              {activeScreen === 'projects' ? (
                <ProjectInventoryView />
              ) : (
                <BrokerPortalView
                  subScreen={
                    activeScreen === 'broker-commissions'
                      ? 'commissions'
                      : activeScreen === 'broker-leads'
                      ? 'leads'
                      : 'overview'
                  }
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <nav
        aria-label="Mobile primary navigation"
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderColor: 'rgba(134, 134, 172, 0.2)',
        }}
        className={`lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t grid ${
          mobileBottomNavItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'
        } px-1 select-none`}
      >
        {mobileBottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectNav(item.id)}
              style={{
                color: isActive ? '#FFFFE3' : '#8686AC',
              }}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1 transition-colors cursor-pointer"
            >
              {isActive && (
                <span
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-b"
                  style={{ backgroundColor: '#FFFFE3' }}
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-center justify-center">
                <Icon className="w-4 h-4 shrink-0" />
                {typeof item.count === 'number' && (
                  <span
                    className="ml-1 text-[10px] leading-none font-mono tabular-nums"
                    style={{ color: isActive ? '#FFFFE3' : '#8686AC' }}
                  >
                    {item.count}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-[14px] font-medium truncate max-w-full px-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ⌘K Command & Search Dialog (480px) */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setCommandOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Quick search"
            className="relative z-10 w-full max-w-[480px] rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-eclipse overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--icon-muted)] shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Jump to screen, unit number, or buyer..."
                className="w-full bg-transparent t-13 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="t-12 t-mono text-[var(--text-tertiary)] shrink-0"
              >
                ESC
              </button>
            </div>

            <div className="p-2 max-h-[65vh] sm:max-h-72 overflow-y-auto space-y-2 t-13">
              <div>
                <div className="px-2 py-1 t-12 text-[var(--text-tertiary)]">
                  Go to
                </div>
                {workspaceItems.concat(financeItems).map((nav) => (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => {
                      setActiveScreen(nav.id);
                      setCommandOpen(false);
                    }}
                    className="w-full px-2.5 py-2 sm:py-1.5 rounded-[6px] text-left hover:bg-[var(--subtle)] flex items-center justify-between cursor-pointer"
                  >
                    <span>{nav.label}</span>
                    <span className="t-12 t-mono text-[var(--text-tertiary)]">
                      Screen
                    </span>
                  </button>
                ))}
              </div>

              {matchedUnits.length > 0 && (
                <div>
                  <div className="px-2 py-1 t-12 text-[var(--text-tertiary)]">
                    Units
                  </div>
                  {matchedUnits.map((u) => {
                    const p = projects.find((pr) => pr.id === u.projectId);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(u.projectId);
                          setActiveScreen('projects');
                          setSelectedUnitId(u.id);
                          setCommandOpen(false);
                        }}
                        className="w-full px-2.5 py-2 sm:py-1.5 rounded-[6px] text-left hover:bg-[var(--subtle)] flex items-center justify-between cursor-pointer"
                      >
                        <span className="t-mono truncate">
                          Unit {u.unitNumber} · {p?.name}
                        </span>
                        <span className="t-12 text-[var(--text-tertiary)] shrink-0 ml-2">
                          {u.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedLeads.length > 0 && (
                <div>
                  <div className="px-2 py-1 t-12 text-[var(--text-tertiary)]">
                    Leads
                  </div>
                  {matchedLeads.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setActiveScreen(
                          role === 'Admin' ? 'leads' : 'broker-leads'
                        );
                        setCommandOpen(false);
                      }}
                      className="w-full px-2.5 py-2 sm:py-1.5 rounded-[6px] text-left hover:bg-[var(--subtle)] flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{l.buyerName}</span>
                      <span className="t-12 t-mono text-[var(--text-tertiary)] shrink-0 ml-2">
                        {formatInr(l.budgetInr)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4s Bottom-Right Toast with 4px Left Colour Bar */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{ borderLeftWidth: '4px', borderLeftColor: '#2E7D5B' }}
          className="fixed bottom-16 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-50 sm:w-full sm:max-w-sm rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-eclipse p-3.5 flex items-start justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="t-13-medium text-[var(--text-primary)]">
              {toast.title}
            </div>
            <div className="t-12 text-[var(--text-secondary)] mt-0.5">
              {toast.description}
            </div>
            {toast.actionLabel && toast.actionScreen && (
              <button
                type="button"
                onClick={() => {
                  setActiveScreen(toast.actionScreen!);
                  dismissToast();
                }}
                className="mt-1.5 t-12 text-[var(--accent)] font-medium hover:underline cursor-pointer"
              >
                {toast.actionLabel} →
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={dismissToast}
            className="btn-ghost btn-sm px-1.5 shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Drawers & Modals */}
      <UnitSlideOver />
      <BookingWorkflowModal />
      <DealCopilotDrawer />
      <SupabaseSchemaModal />
    </div>
  );
}
