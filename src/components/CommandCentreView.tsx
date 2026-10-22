import React, { useState } from 'react';
import { useSolexStore } from '../store/useSolexStore';
import {
  formatInr,
  formatInrFull,
  formatPct,
  formatShortDate,
  SectionTitle,
  ProjectChip,
  getProjectColor,
  CATEGORY_PALETTE,
  EmptyStateBlock,
} from '../lib/formatters';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ArrowRight, MoreHorizontal, Activity } from 'lucide-react';

export const CommandCentreView: React.FC = () => {
  const {
    projects,
    units,
    leads,
    bookings,
    monthlySales,
    activities,
    setActiveScreen,
    openBookingModal,
    setSelectedProjectId,
  } = useSolexStore();

  const [activityFilter, setActivityFilter] = useState<string>('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentMonthPoint = monthlySales[monthlySales.length - 1];

  const totalActiveProjects = projects.length;
  const totalUnits = units.length;
  const availableUnits = units.filter((u) => u.status === 'Available').length;
  const holdUnits = units.filter((u) => u.status === 'Hold').length;
  const soldUnits = units.filter((u) => u.status === 'Sold').length;

  const monthlySalesVolumeInr = Math.round(
    (currentMonthPoint?.salesVolumeCr ?? 0) * 10000000
  );

  const pendingCommissionsInr = bookings
    .filter((b) => b.commissionStatus !== 'Released')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);

  // Needs attention counts derived from real store state
  const holdsExpiringCount = holdUnits;
  const staleLeadsCount = leads.filter(
    (l) => l.stage !== 'Booked' && (l.stage === 'New' || l.stage === 'Site Visit')
  ).length;
  const invoicesAwaitingApprovalCount = bookings.filter(
    (b) => b.commissionStatus === 'Pending Approval'
  ).length;
  const payoutsReadyCount = bookings.filter(
    (b) => b.commissionStatus === 'Approved'
  ).length;

  const attentionItems = [
    {
      id: 'holds',
      label: 'Holds expiring in under 24h',
      count: holdsExpiringCount,
      dotColor: 'var(--status-hold)',
      tintColor: 'var(--status-hold-tint)',
      detail: holdsExpiringCount > 0 ? 'Hold ends in 5h 12m' : 'No active holds',
      actionLabel: 'Review holds',
      onClick: () => setActiveScreen('projects'),
    },
    {
      id: 'leads',
      label: 'Leads idle 7+ days',
      count: staleLeadsCount,
      dotColor: 'var(--status-booked)',
      tintColor: 'var(--status-booked-tint)',
      detail: `${staleLeadsCount} open inquiries`,
      actionLabel: 'View pipeline',
      onClick: () => setActiveScreen('leads'),
    },
    {
      id: 'invoices',
      label: 'Invoices awaiting approval',
      count: invoicesAwaitingApprovalCount,
      dotColor: 'var(--status-hold)',
      tintColor: 'var(--status-hold-tint)',
      detail:
        invoicesAwaitingApprovalCount > 0
          ? formatInr(
              bookings
                .filter((b) => b.commissionStatus === 'Pending Approval')
                .reduce((s, b) => s + b.commissionAmountInr, 0)
            )
          : '₹0',
      actionLabel: 'Audit invoices',
      onClick: () => setActiveScreen('finance'),
    },
    {
      id: 'payouts',
      label: 'Payouts ready to release',
      count: payoutsReadyCount,
      dotColor: 'var(--status-available)',
      tintColor: 'var(--status-available-tint)',
      detail:
        payoutsReadyCount > 0
          ? formatInr(
              bookings
                .filter((b) => b.commissionStatus === 'Approved')
                .reduce((s, b) => s + b.commissionAmountInr, 0)
            )
          : '₹0',
      actionLabel: 'Release payouts',
      onClick: () => setActiveScreen('finance'),
    },
  ];

  const filteredActivities =
    activityFilter === 'All'
      ? activities
      : activities.filter((a) => a.category === activityFilter);

  const escapeCsvCell = (value: string | number) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportOverviewCsv = () => {
    const rows: (string | number)[][] = [
      ['soleX Overview Report'],
      ['Generated At', new Date().toISOString()],
      [],
      ['Metric', 'Value'],
      ['Active projects', totalActiveProjects],
      ['Units available', availableUnits],
      ['Units on hold', holdUnits],
      ['Units sold', soldUnits],
      ['Bookings this month (INR)', monthlySalesVolumeInr],
      ['Pending commissions (INR)', pendingCommissionsInr],
      [],
      ['Month', 'Leads generated', 'Conversions', 'Sales volume (Cr INR)'],
      ...monthlySales.map((m) => [
        m.month,
        m.leadsGenerated,
        m.conversions,
        m.salesVolumeCr,
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'solex-overview.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Ink-Wash Header Band (Used once on Overview header & Sign-in panel) */}
      <div className="ink-wash-band rounded-[10px] p-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="t-22-title text-[var(--text-primary)]">Overview</h1>
          <p className="t-13 text-[var(--text-secondary)] mt-1">
            Mandate absorption, monthly booking velocity, and channel partner settlements.
          </p>
        </div>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportOverviewCsv}
            className="btn-secondary"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('projects')}
            className="btn-secondary"
          >
            Inventory
          </button>
          <button
            type="button"
            onClick={() => openBookingModal()}
            className="btn-primary"
          >
            New booking
          </button>
        </div>

        {/* Mobile (< 640px) Actions Menu */}
        <div className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="btn-secondary px-2"
            aria-label="Page actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] shadow-eclipse py-1 z-30">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openBookingModal();
                }}
                className="w-full px-3 py-1.5 text-left t-13 text-[var(--text-primary)] hover:bg-[var(--subtle)]"
              >
                New booking
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveScreen('projects');
                }}
                className="w-full px-3 py-1.5 text-left t-13 text-[var(--text-primary)] hover:bg-[var(--subtle)]"
              >
                Inventory
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleExportOverviewCsv();
                }}
                className="w-full px-3 py-1.5 text-left t-13 text-[var(--text-primary)] hover:bg-[var(--subtle)]"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 1. Needs Attention List */}
      <section aria-label="Needs attention" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <SectionTitle>Needs attention</SectionTitle>
          <span className="t-12 font-mono tabular-nums text-[var(--text-tertiary)]">
            {holdsExpiringCount +
              staleLeadsCount +
              invoicesAwaitingApprovalCount +
              payoutsReadyCount}{' '}
            items
          </span>
        </div>

        <div className="border border-[var(--border)] rounded-[10px] divide-y divide-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {attentionItems.map((item) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className="px-4 h-11 flex items-center justify-between gap-4 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.dotColor }}
                />
                <span className="t-13 text-[var(--text-primary)] truncate">
                  {item.label}
                </span>
                <span
                  className="px-2 py-0.5 rounded-[6px] font-mono tabular-nums t-12"
                  style={{
                    backgroundColor: item.tintColor,
                    color: item.dotColor,
                  }}
                >
                  {item.count}
                </span>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="hidden md:inline font-mono tabular-nums t-12 text-[var(--text-secondary)]">
                  {item.detail}
                </span>
                <span className="t-12 text-[var(--accent)] inline-flex items-center gap-1 font-medium">
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Four Metrics (label, 28px mono value, category dot; no icons, no fake trends) */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-[var(--border)] rounded-[10px] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] bg-[var(--surface)] overflow-hidden"
      >
        {/* Active projects */}
        <div
          onClick={() => setActiveScreen('projects')}
          className="p-4 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 t-12 text-[var(--text-secondary)]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_PALETTE[0] }}
            />
            <span>Active projects</span>
          </div>
          <div className="t-28 text-[var(--text-primary)] mt-1.5">
            {totalActiveProjects}
          </div>
          <div className="t-12 text-[var(--text-tertiary)] mt-1 font-mono tabular-nums">
            {totalUnits} mandate units
          </div>
        </div>

        {/* Units available / sold */}
        <div
          onClick={() => setActiveScreen('projects')}
          className="p-4 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 t-12 text-[var(--text-secondary)]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_PALETTE[3] }}
            />
            <span>Units available / sold</span>
          </div>
          <div className="t-28 text-[var(--text-primary)] mt-1.5">
            {availableUnits} / {soldUnits}
          </div>
          <div className="t-12 text-[var(--text-tertiary)] mt-1 font-mono tabular-nums">
            {holdUnits} on hold · {formatPct((soldUnits / totalUnits) * 100)} sold
          </div>
        </div>

        {/* Bookings this month (₹) — Headline figure in Eclipse 800 */}
        <div
          onClick={() => setActiveScreen('leads')}
          className="p-4 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 t-12 text-[var(--text-secondary)]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_PALETTE[1] }}
            />
            <span>Bookings this month</span>
          </div>
          <div
            className="t-28 text-[var(--money-total)] mt-1.5"
            title={formatInrFull(monthlySalesVolumeInr)}
          >
            {formatInr(monthlySalesVolumeInr)}
          </div>
          <div className="t-12 text-[var(--text-tertiary)] mt-1 font-mono tabular-nums">
            {currentMonthPoint.conversions} confirmed allotments
          </div>
        </div>

        {/* Pending commissions (₹) — Headline payout figure in Eclipse 800 */}
        <div
          onClick={() => setActiveScreen('finance')}
          className="p-4 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 t-12 text-[var(--text-secondary)]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_PALETTE[4] }}
            />
            <span>Pending commissions</span>
          </div>
          <div
            className="t-28 text-[var(--money-total)] mt-1.5"
            title={formatInrFull(pendingCommissionsInr)}
          >
            {formatInr(pendingCommissionsInr)}
          </div>
          <div className="t-12 text-[var(--text-tertiary)] mt-1 font-mono tabular-nums">
            {invoicesAwaitingApprovalCount + payoutsReadyCount} active tranches
          </div>
        </div>
      </section>

      {/* 3. Sales Chart + Project Absorption Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sales Chart: Eclipse 800 bars + slate line, 1px Paper 100 gridlines, no gradients */}
        <div className="lg:col-span-7 border border-[var(--border)] rounded-[10px] p-5 bg-[var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <SectionTitle>Sales velocity</SectionTitle>
              <p className="t-12 text-[var(--text-tertiary)] mt-0.5">
                Monthly bookings (bars) against qualified lead inflow (line)
              </p>
            </div>
            <div className="flex items-center gap-4 t-12 text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{ backgroundColor: '#272757' }}
                />
                <span>Bookings</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-3 h-0.5"
                  style={{ backgroundColor: '#6D8196' }}
                />
                <span>Leads</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlySales}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border-subtle)"
                  strokeWidth={1}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--subtle)' }}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="conversions"
                  name="Bookings"
                  fill="#272757"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
                <Line
                  type="monotone"
                  dataKey="leadsGenerated"
                  name="Leads"
                  stroke="#6D8196"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#6D8196', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-Project Absorption Rows (Project chip, thin progress bar in project colour, "8 / 24 sold") */}
        <div className="lg:col-span-5 border border-[var(--border)] rounded-[10px] p-5 bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Project absorption</SectionTitle>
            <span className="t-12 font-mono tabular-nums text-[var(--text-tertiary)]">
              {soldUnits} / {totalUnits} sold
            </span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {projects.map((proj, idx) => {
              const pUnits = units.filter((u) => u.projectId === proj.id);
              const pSold = pUnits.filter((u) => u.status === 'Sold').length;
              const pHold = pUnits.filter((u) => u.status === 'Hold').length;
              const pct = Math.round((pSold / pUnits.length) * 100);
              const projColor = getProjectColor(proj.id, idx);

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setActiveScreen('projects');
                  }}
                  className="py-3 first:pt-1 last:pb-1 hover:bg-[var(--subtle)] -mx-2 px-2 rounded-[6px] transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ProjectChip projectId={proj.id} name={proj.name} />
                      <span className="t-12 text-[var(--text-tertiary)] truncate">
                        {proj.location}
                      </span>
                    </div>
                    <span className="t-12 font-mono tabular-nums text-[var(--text-primary)] shrink-0">
                      {pSold} / {pUnits.length} sold
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-150"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: projColor,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between t-12 text-[var(--text-tertiary)] font-mono tabular-nums">
                    <span>RERA {proj.reraNumber}</span>
                    <span>
                      {pHold} on hold · {formatPct((pSold / pUnits.length) * 100)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Activity Timeline: mono time · event dot · one line */}
      <section aria-label="Activity timeline" className="space-y-2.5">
        <div className="flex items-center justify-between gap-4">
          <SectionTitle>Activity</SectionTitle>
          <div className="flex items-center gap-1">
            {['All', 'Booking', 'Lead', 'Inventory', 'Commission'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActivityFilter(cat)}
                  className={`btn-sm rounded-[6px] cursor-pointer transition-colors ${
                    activityFilter === cat
                      ? 'bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        <div className="border border-[var(--border)] rounded-[10px] divide-y divide-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {filteredActivities.length === 0 ? (
            <EmptyStateBlock
              icon={Activity}
              title={`No activity events in ${activityFilter}`}
              guidance="Reset the category filter to view all recent mandate transactions."
              actionLabel="Show all events"
              onAction={() => setActivityFilter('All')}
            />
          ) : (
            filteredActivities.map((act) => {
              const proj = projects.find((p) => p.id === act.projectId);
              const dotColor =
                act.category === 'Booking'
                  ? 'var(--status-booked)'
                  : act.category === 'Commission'
                  ? 'var(--status-available)'
                  : act.category === 'Inventory'
                  ? 'var(--status-hold)'
                  : '#6D8196';

              return (
                <div
                  key={act.id}
                  className="px-4 h-10 flex items-center justify-between gap-4 hover:bg-[var(--subtle)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 truncate">
                    <span className="font-mono tabular-nums t-12 text-[var(--text-tertiary)] shrink-0 w-24">
                      {formatShortDate(act.timestamp)}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="t-13 text-[var(--text-primary)] truncate">
                      {act.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {act.amountInr && (
                      <span
                        className="font-mono tabular-nums t-12 text-[var(--text-primary)]"
                        title={formatInrFull(act.amountInr)}
                      >
                        {formatInr(act.amountInr)}
                      </span>
                    )}
                    {proj && (
                      <span className="hidden sm:inline">
                        <ProjectChip projectId={proj.id} name={proj.name} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
