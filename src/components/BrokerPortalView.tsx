import React, { useEffect, useState } from 'react';
import {
  useSolexStore,
  formatInrCompact,
} from '../store/useSolexStore';
import { LeadPipelineView } from './LeadPipelineView';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Users,
  Award,
  FileCode2,
  ShieldCheck,
  ArrowUpRight,
  Download,
} from 'lucide-react';

export const BrokerCommissionsView: React.FC = () => {
  const {
    role,
    activeBrokerId,
    brokers,
    bookings,
    projects,
    units,
    leads,
    advanceCommissionStatus,
  } = useSolexStore();

  const activeBroker =
    brokers.find((b) => b.id === activeBrokerId) || brokers[0];

  const visibleBookings =
    role === 'Broker'
      ? bookings.filter((b) => b.brokerId === activeBroker.id)
      : bookings;

  const pendingInr = visibleBookings
    .filter((b) => b.commissionStatus === 'Pending Approval')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);

  const approvedInr = visibleBookings
    .filter((b) => b.commissionStatus === 'Approved')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);

  const releasedInr = visibleBookings
    .filter((b) => b.commissionStatus === 'Released')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);

  const escapeCsvCell = (value: string | number) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCommissionsCsv = () => {
    const header = [
      'Booking ID',
      'Booked Date',
      'Project Name',
      'Unit Number',
      'Configuration',
      'Allotted Buyer',
      'Channel Partner Name',
      'Brokerage Firm',
      'RERA ID',
      'Agreement Value (INR)',
      'Commission Share (%)',
      'Commission Amount (INR)',
      'Payout Status',
    ];

    const dataRows = visibleBookings.map((bkg) => {
      const proj = projects.find((p) => p.id === bkg.projectId);
      const unit = units.find((u) => u.id === bkg.unitId);
      const lead = leads.find((l) => l.id === bkg.leadId);
      const brk = brokers.find((b) => b.id === bkg.brokerId);

      return [
        bkg.id,
        bkg.bookedAt,
        proj?.name || '',
        unit?.unitNumber || '',
        unit?.bhk || '',
        lead?.buyerName || 'Allotted Buyer',
        brk?.name || '',
        brk?.firmName || '',
        brk?.reraId || '',
        bkg.agreementValueInr,
        `${bkg.commissionPct}%`,
        bkg.commissionAmountInr,
        bkg.commissionStatus,
      ];
    });

    const summaryRows: (string | number)[][] = [
      [],
      ['COMMISSION SUMMARY METRICS'],
      ['Pending Mandate Audit (INR)', pendingInr],
      ['Approved for Disbursement (INR)', approvedInr],
      ['Released & Settled Payouts (INR)', releasedInr],
    ];

    const allRows = [header, ...dataRows, ...summaryRows];
    const csvContent = allRows
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename =
      role === 'Broker'
        ? `solex-my-commissions-${activeBroker.id}.csv`
        : 'solex-mandate-commissions-ledger.csv';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {role === 'Broker'
              ? `My Commissions — ${activeBroker.name} (${activeBroker.firmName})`
              : 'Mandate Finance & Commission Payout Ledger'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {role === 'Broker'
              ? `RERA Registration: ${activeBroker.reraId} · ${activeBroker.tier} Tier Channel Partner`
              : 'Verify booking allotments, approve channel partner invoices, and release brokerage tranches.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCommissionsCsv}
            className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3 Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Pending Mandate Audit</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums mt-3">
            {formatInrCompact(pendingInr)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Awaiting 10% buyer payment realization & invoice verification
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Approved for Disbursement</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-indigo-600 font-mono tabular-nums mt-3">
            {formatInrCompact(approvedInr)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Cleared by soleX Mandate Finance · Scheduled for NEFT/RTGS run
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Released & Settled Payouts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-600 font-mono tabular-nums mt-3">
            {formatInrCompact(releasedInr)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Settled net of 5% TDS under Section 194H
          </div>
        </div>
      </div>

      {/* Commission Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Booking-Linked Commission Tranches ({visibleBookings.length})
          </h2>
          <span className="text-xs text-slate-500">
            Every new booking automatically creates a ledger row here
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-500">
                <th className="py-3 px-4">Project & Unit</th>
                <th className="py-3 px-4">Allotted Buyer</th>
                <th className="py-3 px-4">Channel Partner</th>
                <th className="py-3 px-4 text-right">Agreement Value</th>
                <th className="py-3 px-4 text-right">Brokerage (₹)</th>
                <th className="py-3 px-4">Payout Status</th>
                {role === 'Admin' && (
                  <th className="py-3 px-4 text-right">Finance Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {visibleBookings.map((bkg) => {
                const proj = projects.find((p) => p.id === bkg.projectId);
                const unit = units.find((u) => u.id === bkg.unitId);
                const lead = leads.find((l) => l.id === bkg.leadId);
                const brk = brokers.find((b) => b.id === bkg.brokerId);

                return (
                  <tr
                    key={bkg.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {proj?.name}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        Unit {unit?.unitNumber} · {unit?.bhk}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                      {lead?.buyerName || 'Allotted Buyer'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-900">
                        {brk?.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {brk?.firmName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                      {formatInrCompact(bkg.agreementValueInr)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-indigo-600">
                        {formatInrCompact(bkg.commissionAmountInr)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {bkg.commissionPct}% Mandate Share
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          bkg.commissionStatus === 'Released'
                            ? 'text-emerald-700'
                            : bkg.commissionStatus === 'Approved'
                            ? 'text-indigo-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {bkg.commissionStatus}
                      </span>
                    </td>
                    {role === 'Admin' && (
                      <td className="py-3.5 px-4 text-right">
                        {bkg.commissionStatus !== 'Released' ? (
                          <button
                            type="button"
                            onClick={() => advanceCommissionStatus(bkg.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {bkg.commissionStatus === 'Pending Approval'
                              ? 'Approve Invoice'
                              : 'Release Payout'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            Settled
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminBrokersDirectoryView: React.FC = () => {
  const {
    brokers,
    leads,
    bookings,
    setRole,
    setActiveBrokerId,
  } = useSolexStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Empanelled Channel Partners (Brokers)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            RERA-verified brokerage firms actively marketing soleX mandated developments. Click &ldquo;Impersonate Broker Portal&rdquo; to preview their isolated RBAC view.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brokers.map((brk) => {
          const brokerLeads = leads.filter((l) => l.assignedBrokerId === brk.id);
          const brokerBookings = bookings.filter((b) => b.brokerId === brk.id);
          const totalSalesInr = brokerBookings.reduce(
            (sum, b) => sum + b.agreementValueInr,
            0
          );
          const pendingCommInr = brokerBookings
            .filter((b) => b.commissionStatus !== 'Released')
            .reduce((sum, b) => sum + b.commissionAmountInr, 0);

          return (
            <div
              key={brk.id}
              className="p-6 bg-white rounded-xl border border-slate-200 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-semibold text-indigo-600">
                        {brk.tier} Channel Partner
                      </span>
                      <span>·</span>
                      <span>{brk.city}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      {brk.name} — {brk.firmName}
                    </h2>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      RERA ID: {brk.reraId} · {brk.phone}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500">Registered Leads</div>
                    <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                      {brokerLeads.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Gross Bookings</div>
                    <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                      {formatInrCompact(totalSalesInr)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Pending Payout</div>
                    <div className="text-lg font-bold text-indigo-600 font-mono mt-0.5">
                      {formatInrCompact(pendingCommInr)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBrokerId(brk.id);
                    setRole('Broker');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Open Broker Portal as {brk.name}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ArchitectureBlueprintView: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>('Loading ARCHITECTURE.md...');

  useEffect(() => {
    fetch('/api/architecture')
      .then((r) => r.json())
      .then((data) => {
        if (data.content) setMarkdown(data.content);
      })
      .catch(() => {
        setMarkdown('Unable to load ARCHITECTURE.md from server.');
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Mandatory Deliverable · /ARCHITECTURE.md</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Production Architecture & Relational Schema Blueprint
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live rendering of `/ARCHITECTURE.md` detailing Next.js + Supabase RBAC, PostgreSQL DDL, pessimistic locking (`SELECT ... FOR UPDATE NOWAIT`), and cloud security.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-6 overflow-x-auto">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800 text-xs text-slate-400 font-mono">
          <FileCode2 className="w-4 h-4 text-indigo-400" />
          <span>/ARCHITECTURE.md</span>
        </div>
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-slate-200">
          {markdown}
        </pre>
      </div>
    </div>
  );
};

export const BrokerPortalView: React.FC<{ subScreen: 'leads' | 'commissions' }> = ({
  subScreen,
}) => {
  const { activeBrokerId, setActiveBrokerId, brokers, leads, bookings } =
    useSolexStore();

  const activeBroker =
    brokers.find((b) => b.id === activeBrokerId) || brokers[0];
  const myLeads = leads.filter((l) => l.assignedBrokerId === activeBroker.id);
  const myBookings = bookings.filter((b) => b.brokerId === activeBroker.id);
  const myPendingInr = myBookings
    .filter((b) => b.commissionStatus !== 'Released')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);

  return (
    <div className="space-y-6">
      {/* Broker Context Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs text-indigo-300 font-medium">
              Role-Based Access Demo · Isolated Channel Partner Session
            </div>
            <div className="text-sm font-bold">
              {activeBroker.name} · {activeBroker.firmName} ({activeBroker.reraId})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-300 hidden md:block">
            <span className="font-mono font-bold text-white">{myLeads.length}</span> My Leads ·{' '}
            <span className="font-mono font-bold text-emerald-400">
              {formatInrCompact(myPendingInr)}
            </span>{' '}
            Pending Commission
          </div>

          <select
            value={activeBrokerId}
            onChange={(e) => setActiveBrokerId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
            aria-label="Switch active broker persona"
          >
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                Persona: {b.name} ({b.firmName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {subScreen === 'leads' ? <LeadPipelineView /> : <BrokerCommissionsView />}
    </div>
  );
};
