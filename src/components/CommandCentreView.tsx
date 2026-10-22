import React, { useState } from 'react';
import {
  useSolexStore,
  formatInrCompact,
} from '../store/useSolexStore';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Building2,
  Layers,
  IndianRupee,
  Wallet,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  Minus,
  Download,
} from 'lucide-react';

function calculateMoMChangePct(current: number, previous: number): number {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

const TrendDeltaIndicator: React.FC<{
  changePct: number;
  comparisonLabel: string;
}> = ({ changePct, comparisonLabel }) => {
  const isPositive = changePct > 0.05;
  const isNegative = changePct < -0.05;
  const formattedPct = `${isPositive ? '+' : ''}${changePct.toFixed(1)}%`;

  return (
    <div
      className={`inline-flex items-center gap-1 text-xs font-semibold font-mono tabular-nums whitespace-nowrap shrink-0 ${
        isPositive
          ? 'text-emerald-600'
          : isNegative
          ? 'text-red-600'
          : 'text-slate-500'
      }`}
      title={`${formattedPct} compared to ${comparisonLabel}`}
    >
      {isPositive && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-xs bg-emerald-50 text-emerald-600 shrink-0"
          aria-hidden="true"
        >
          <ArrowUp className="w-3 h-3 stroke-[2.5]" />
        </span>
      )}
      {isNegative && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-xs bg-red-50 text-red-600 shrink-0"
          aria-hidden="true"
        >
          <ArrowDown className="w-3 h-3 stroke-[2.5]" />
        </span>
      )}
      {!isPositive && !isNegative && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-xs bg-slate-100 text-slate-500 shrink-0"
          aria-hidden="true"
        >
          <Minus className="w-3 h-3 stroke-[2.5]" />
        </span>
      )}
      <span>{formattedPct}</span>
      <span className="font-sans font-normal text-slate-400">
        vs {comparisonLabel}
      </span>
    </div>
  );
};

export const CommandCentreView: React.FC = () => {
  const {
    projects,
    units,
    bookings,
    monthlySales,
    activities,
    setActiveScreen,
    openBookingModal,
  } = useSolexStore();

  const [chartMetric, setChartMetric] = useState<'conversions' | 'volume'>('conversions');
  const [activityFilter, setActivityFilter] = useState<string>('All');

  // Derive current month and previous month series points directly from the store
  const currentMonthPoint = monthlySales[monthlySales.length - 1];
  const prevMonthPoint =
    monthlySales.length >= 2
      ? monthlySales[monthlySales.length - 2]
      : currentMonthPoint;

  // 1. Total Active Projects & MoM % Change
  const totalActiveProjects = projects.length;
  const projectsGrowthNum = calculateMoMChangePct(
    totalActiveProjects,
    prevMonthPoint.activeProjectsCount
  );

  // 2. Total Inventory Available vs. Sold & MoM Sold Conversions % Change
  const totalUnits = units.length;
  const availableUnits = units.filter((u) => u.status === 'Available').length;
  const holdUnits = units.filter((u) => u.status === 'Hold').length;
  const soldUnits = units.filter((u) => u.status === 'Sold').length;
  const soldConversionsGrowthNum = calculateMoMChangePct(
    currentMonthPoint.conversions,
    prevMonthPoint.conversions
  );

  // 3. Monthly Sales Volume (INR) & MoM % Change
  const monthlySalesVolumeInr = Math.round(currentMonthPoint.salesVolumeCr * 10000000);
  const salesVolumeGrowthNum = calculateMoMChangePct(
    currentMonthPoint.salesVolumeCr,
    prevMonthPoint.salesVolumeCr
  );

  // 4. Pending Broker Commissions (INR) & MoM % Change
  const pendingCommissionsInr = bookings
    .filter((b) => b.commissionStatus !== 'Released')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);
  const commissionGrowthNum = calculateMoMChangePct(
    pendingCommissionsInr,
    prevMonthPoint.pendingCommissionsInr
  );

  const pendingBookingCount = bookings.filter(
    (b) => b.commissionStatus !== 'Released'
  ).length;

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

  const formatSignedPct = (val: number) =>
    `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;

  const handleExportCommandCentreCsv = () => {
    const rows: (string | number)[][] = [
      ['soleX Management Command Centre — Performance Report'],
      ['Generated At', new Date().toISOString()],
      [],
      ['EXECUTIVE KPI SUMMARY'],
      ['Metric', 'Current Value', `Previous Month (${prevMonthPoint.month})`, `MoM Trend vs ${prevMonthPoint.month}`],
      [
        'Total Active Projects',
        totalActiveProjects,
        prevMonthPoint.activeProjectsCount,
        formatSignedPct(projectsGrowthNum),
      ],
      [
        'Monthly Unit Conversions (Sold Velocity)',
        currentMonthPoint.conversions,
        prevMonthPoint.conversions,
        formatSignedPct(soldConversionsGrowthNum),
      ],
      ['Total Mandate Units', totalUnits, '-', '-'],
      ['Units Available', availableUnits, '-', '-'],
      ['Units On Hold', holdUnits, '-', '-'],
      ['Cumulative Units Sold', soldUnits, '-', '-'],
      [
        'Monthly Sales Volume (INR)',
        monthlySalesVolumeInr,
        Math.round(prevMonthPoint.salesVolumeCr * 10000000),
        formatSignedPct(salesVolumeGrowthNum),
      ],
      [
        'Pending Broker Commissions (INR)',
        pendingCommissionsInr,
        prevMonthPoint.pendingCommissionsInr,
        formatSignedPct(commissionGrowthNum),
      ],
      [],
      ['6-MONTH SALES VELOCITY & CONVERSIONS'],
      ['Month', 'Active Projects', 'Leads Generated', 'Unit Conversions', 'Sales Volume (Cr INR)', 'Pending Commissions (INR)'],
      ...monthlySales.map((m) => [
        m.month,
        m.activeProjectsCount,
        m.leadsGenerated,
        m.conversions,
        m.salesVolumeCr,
        m.pendingCommissionsInr,
      ]),
      [],
      ['PROJECT MANDATE ABSORPTION BREAKDOWN'],
      ['Project Name', 'Location', 'Developer', 'Mandate Type', 'Total Units', 'Available', 'On Hold', 'Sold', 'Absorption (%)'],
      ...projects.map((p) => {
        const pUnits = units.filter((u) => u.projectId === p.id);
        const pAvail = pUnits.filter((u) => u.status === 'Available').length;
        const pHold = pUnits.filter((u) => u.status === 'Hold').length;
        const pSold = pUnits.filter((u) => u.status === 'Sold').length;
        const pct = Math.round((pSold / pUnits.length) * 100);
        return [
          p.name,
          p.location,
          p.developerName,
          p.mandateType,
          pUnits.length,
          pAvail,
          pHold,
          pSold,
          `${pct}%`,
        ];
      }),
    ];

    const csvContent = rows
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'solex-command-centre-performance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Management Command Centre
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            Real-time portfolio absorption, sales velocity, and channel partner payout ledger across all active developer mandates.
          </p>
        </div>

        {/* Responsive Action Group: 2x2 grid on narrow mobile, horizontal row on tablet/desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCommandCentreCsv}
            className="col-span-1 justify-center px-3 py-2.5 sm:py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('projects')}
            className="col-span-1 justify-center px-3 py-2.5 sm:py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>2D / 3D Inventory</span>
          </button>
          <button
            type="button"
            onClick={() => openBookingModal()}
            className="col-span-2 sm:col-span-1 justify-center px-3.5 py-2.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Convert Lead to Booking</span>
          </button>
        </div>
      </div>

      {/* 4 Live KPI Cards: 1-col on mobile, 2x2 on tablet (sm/md/lg), 4-col on desktop (xl) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Active Projects */}
        <div
          onClick={() => setActiveScreen('projects')}
          className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 text-slate-500">
            <span className="text-xs font-semibold truncate">
              Total Active Projects
            </span>
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {totalActiveProjects}
            </span>
            <TrendDeltaIndicator
              changePct={projectsGrowthNum}
              comparisonLabel={prevMonthPoint.month}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2">
            <span className="truncate">
              Prev ({prevMonthPoint.month}): {prevMonthPoint.activeProjectsCount} Mandates
            </span>
            <span className="text-indigo-600 font-medium flex items-center gap-0.5 shrink-0">
              <span>View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* KPI 2: Total Inventory Available vs. Sold */}
        <div
          onClick={() => setActiveScreen('projects')}
          className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 text-slate-500">
            <span className="text-xs font-semibold truncate">
              Inventory: Available vs. Sold
            </span>
            <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1.5">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono tabular-nums">
                {availableUnits}
              </span>
              <span className="text-xs text-slate-400">Avail</span>
              <span className="text-slate-300">/</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-800 font-mono tabular-nums">
                {soldUnits}
              </span>
              <span className="text-xs text-slate-500">Sold</span>
            </div>

            <TrendDeltaIndicator
              changePct={soldConversionsGrowthNum}
              comparisonLabel={prevMonthPoint.month}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2">
            <span className="font-mono tabular-nums">
              Stock: {totalUnits} Units
            </span>
            <span className="text-amber-700 font-mono tabular-nums shrink-0">
              {holdUnits} on Hold
            </span>
          </div>
        </div>

        {/* KPI 3: Monthly Sales Volume (INR) */}
        <div
          onClick={() => setActiveScreen('leads')}
          className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 text-slate-500">
            <span className="text-xs font-semibold truncate">
              Monthly Sales Volume (₹)
            </span>
            <IndianRupee className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums whitespace-nowrap">
              {formatInrCompact(monthlySalesVolumeInr)}
            </span>
            <TrendDeltaIndicator
              changePct={salesVolumeGrowthNum}
              comparisonLabel={prevMonthPoint.month}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2">
            <span className="font-mono tabular-nums truncate">
              Prev: ₹{prevMonthPoint.salesVolumeCr} Cr
            </span>
            <span className="font-semibold text-slate-800 font-mono tabular-nums shrink-0">
              {currentMonthPoint.conversions} Bookings
            </span>
          </div>
        </div>

        {/* KPI 4: Pending Broker Commissions (INR) */}
        <div
          onClick={() => setActiveScreen('finance')}
          className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 text-slate-500">
            <span className="text-xs font-semibold truncate">
              Pending Broker Commissions (₹)
            </span>
            <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums whitespace-nowrap">
              {formatInrCompact(pendingCommissionsInr)}
            </span>
            <TrendDeltaIndicator
              changePct={commissionGrowthNum}
              comparisonLabel={prevMonthPoint.month}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2">
            <span className="font-mono tabular-nums truncate">
              Prev: {formatInrCompact(prevMonthPoint.pendingCommissionsInr)}
            </span>
            <span className="text-amber-700 font-medium font-mono tabular-nums shrink-0">
              {pendingBookingCount} Tranches
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: 6-Month Recharts Bar Chart (Left 7 Cols) + Live Activity Feed (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Left: Recharts Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Sales Conversions (Last 6 Months)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updates instantaneously when a lead is converted to a confirmed booking.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setChartMetric('conversions')}
                  className={`px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    chartMetric === 'conversions'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unit Conversions
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('volume')}
                  className={`px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    chartMetric === 'volume'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sales Volume (₹ Cr)
                </button>
              </div>
            </div>

            <div className="h-60 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlySales}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) =>
                      chartMetric === 'conversions'
                        ? [`${value} Units Booked`, 'Conversions']
                        : [`₹${value} Cr`, 'Gross Sales Volume']
                    }
                  />
                  <Bar
                    dataKey={chartMetric === 'conversions' ? 'conversions' : 'salesVolumeCr'}
                    fill="#4f46e5"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mandate Portfolio Breakdown Strip */}
          <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
            {projects.map((proj) => {
              const pUnits = units.filter((u) => u.projectId === proj.id);
              const pSold = pUnits.filter((u) => u.status === 'Sold').length;
              const pAvail = pUnits.filter((u) => u.status === 'Available').length;
              const pct = Math.round((pSold / pUnits.length) * 100);
              return (
                <div
                  key={proj.id}
                  className="text-xs flex sm:block items-center justify-between gap-2 py-1 sm:py-0"
                >
                  <div className="font-semibold text-slate-900 truncate">
                    {proj.name}
                  </div>
                  <div className="text-slate-500 font-mono tabular-nums sm:mt-0.5 shrink-0">
                    {pSold}/{pUnits.length} Sold ({pct}%) · {pAvail} Avail
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Scrolling Real-Time Activity Feed */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live Mandate Activity Feed
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit stream of bookings, unit holds, and channel leads.
                </p>
              </div>

              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                aria-label="Filter mandate activity feed"
                className="w-full sm:w-auto px-2.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50"
              >
                <option value="All">All Events ({activities.length})</option>
                <option value="Booking">Bookings</option>
                <option value="Lead">Leads</option>
                <option value="Inventory">Inventory Holds</option>
                <option value="Commission">Commissions</option>
              </select>
            </div>

            <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto pr-1">
              {filteredActivities.map((act) => {
                const proj = projects.find((p) => p.id === act.projectId);
                return (
                  <div key={act.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-slate-800">
                          {act.category}
                        </span>
                        <span>·</span>
                        <span className="truncate">{proj?.name}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">{act.actorRole}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        {act.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {act.message}
                    </p>

                    {act.amountInr && (
                      <div className="mt-1 text-xs font-mono font-semibold text-indigo-600 tabular-nums">
                        Transaction Value: {formatInrCompact(act.amountInr)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredActivities.length} recent audit events</span>
            <button
              type="button"
              onClick={() => setActiveScreen('leads')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
            >
              Open Lead Pipeline →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
