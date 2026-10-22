import React, { useEffect, useState } from 'react';
import {
  useSolexStore,
  BookingRecord,
} from '../store/useSolexStore';
import {
  formatInr,
  formatInrFull,
  formatPct,
  formatShortDate,
  CommissionStatusBadge,
  SectionTitle,
  ProjectChip,
} from '../lib/formatters';
import { LeadPipelineView } from './LeadPipelineView';
import { Download, X, ArrowRight } from 'lucide-react';

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

  const [confirmBooking, setConfirmBooking] = useState<BookingRecord | null>(
    null
  );

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

  // Totals row calculations
  const totalAgreementValueInr = visibleBookings.reduce(
    (sum, b) => sum + b.agreementValueInr,
    0
  );
  const totalBrokerageInr = visibleBookings.reduce(
    (sum, b) => sum + b.commissionAmountInr,
    0
  );
  const totalTdsInr = Math.round(totalBrokerageInr * 0.05);
  const totalNetPayableInr = totalBrokerageInr - totalTdsInr;

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
      'Brokerage (INR)',
      'TDS 194H 5% (INR)',
      'Net Payable (INR)',
      'Payout Status',
    ];

    const dataRows = visibleBookings.map((bkg) => {
      const proj = projects.find((p) => p.id === bkg.projectId);
      const unit = units.find((u) => u.id === bkg.unitId);
      const lead = leads.find((l) => l.id === bkg.leadId);
      const brk = brokers.find((b) => b.id === bkg.brokerId);
      const tds = Math.round(bkg.commissionAmountInr * 0.05);
      const net = bkg.commissionAmountInr - tds;

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
        tds,
        net,
        bkg.commissionStatus,
      ];
    });

    const csvContent = [header, ...dataRows]
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="t-22-title text-[var(--text-primary)]">Payouts</h1>
          <p className="t-13 text-[var(--text-secondary)] mt-0.5">
            {role === 'Broker'
              ? `Brokerage ledger for ${activeBroker.firmName} (${activeBroker.reraId}).`
              : 'Channel partner commission invoices, Section 194H TDS deductions, and disbursement tranches.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCommissionsCsv}
            className="btn-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Three Summary Panels: Pending audit = warning label, Approved = Eclipse label, Settled = neutral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--border)] rounded-[10px] bg-[var(--surface)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-[6px] t-12"
              style={{
                backgroundColor: 'var(--status-hold-tint)',
                color: 'var(--status-hold)',
              }}
            >
              Pending audit
            </span>
          </div>
          <div
            className="t-28 text-[var(--money-total)] mt-2"
            title={formatInrFull(pendingInr)}
          >
            {formatInr(pendingInr)}
          </div>
          <div className="t-12 text-[var(--text-tertiary)] mt-1">
            Awaiting 10% buyer realization & invoice verification
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-[6px] t-12"
              style={{
                backgroundColor: 'var(--status-booked-tint)',
                color: 'var(--status-booked)',
              }}
            >
              Approved for disbursement
            </span>
          </div>
          <div
            className="t-28 text-[var(--money-total)] mt-2"
            title={formatInrFull(approvedInr)}
          >
            {formatInr(approvedInr)}
          </div>
          <div className="t-12 text-[var(--text-tertiary)] mt-1">
            Cleared by mandate finance · Ready for NEFT/RTGS release
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-[6px] t-12"
              style={{
                backgroundColor: 'var(--status-sold-tint)',
                color: 'var(--status-sold)',
              }}
            >
              Settled
            </span>
          </div>
          <div
            className="t-28 text-[var(--text-primary)] mt-2"
            title={formatInrFull(releasedInr)}
          >
            {formatInr(releasedInr)}
          </div>
          <div className="t-12 text-[var(--text-tertiary)] mt-1">
            Disbursed net of 5.0% TDS under Section 194H
          </div>
        </div>
      </div>

      {/* Ledger: Mobile Cards (<768px) + Desktop Table (>=768px) */}
      <div className="border border-[var(--border)] rounded-[10px] bg-[var(--surface)] overflow-hidden">
        {/* Mobile Ledger Cards (< 768px) */}
        <div className="md:hidden divide-y divide-[var(--border)]">
          {visibleBookings.map((bkg) => {
            const proj = projects.find((p) => p.id === bkg.projectId);
            const unit = units.find((u) => u.id === bkg.unitId);
            const lead = leads.find((l) => l.id === bkg.leadId);
            const brk = brokers.find((b) => b.id === bkg.brokerId);
            const tdsInr = Math.round(bkg.commissionAmountInr * 0.05);
            const netInr = bkg.commissionAmountInr - tdsInr;

            return (
              <div key={bkg.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {proj && (
                      <ProjectChip projectId={proj.id} name={proj.name} />
                    )}
                    <span className="text-[var(--text-primary)] t-mono font-medium t-13">
                      Unit {unit?.unitNumber}
                    </span>
                  </div>
                  <CommissionStatusBadge status={bkg.commissionStatus} />
                </div>

                <div className="flex items-center justify-between gap-2 t-12 text-[var(--text-secondary)]">
                  <span className="truncate">
                    Buyer: {lead?.buyerName || 'Allotted buyer'}
                  </span>
                  <span className="truncate text-[var(--text-tertiary)]">
                    {brk?.firmName}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] t-12">
                  <div>
                    <div className="text-[var(--text-tertiary)]">Agreement</div>
                    <div className="t-mono text-[var(--text-primary)] mt-0.5">
                      {formatInr(bkg.agreementValueInr)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)]">
                      Brokerage ({formatPct(bkg.commissionPct)})
                    </div>
                    <div className="t-mono text-[var(--text-primary)] mt-0.5">
                      {formatInr(bkg.commissionAmountInr)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--text-tertiary)]">
                      Net payable
                    </div>
                    <div className="t-mono font-semibold text-[var(--money-total)] mt-0.5">
                      {formatInr(netInr)}
                    </div>
                  </div>
                </div>

                {role === 'Admin' && bkg.commissionStatus !== 'Released' && (
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="t-12 t-mono text-[var(--text-tertiary)]">
                      TDS 194H: {formatInr(tdsInr)}
                    </span>
                    {bkg.commissionStatus === 'Pending Approval' ? (
                      <button
                        type="button"
                        onClick={() => setConfirmBooking(bkg)}
                        className="btn-secondary btn-sm"
                      >
                        Approve invoice
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmBooking(bkg)}
                        className="btn-accent btn-sm"
                      >
                        Release payout
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Mobile Totals Footer */}
          <div className="p-3.5 bg-[var(--subtle)] space-y-2 t-12">
            <div className="font-semibold text-[var(--text-primary)]">
              Total ({visibleBookings.length} tranches)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[var(--text-tertiary)]">Agreement</div>
                <div className="t-mono font-semibold text-[var(--money-total)] mt-0.5">
                  {formatInr(totalAgreementValueInr)}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-tertiary)]">Brokerage</div>
                <div className="t-mono font-semibold text-[var(--money-total)] mt-0.5">
                  {formatInr(totalBrokerageInr)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[var(--text-tertiary)]">Net payable</div>
                <div className="t-mono font-semibold text-[var(--money-total)] mt-0.5">
                  {formatInr(totalNetPayableInr)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop/Tablet Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--subtle)] border-b border-[var(--border)]">
              <tr className="h-9 text-[12px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4">Project / Unit</th>
                <th className="px-4">Buyer</th>
                <th className="px-4">Channel partner</th>
                <th className="px-4 text-right">Agreement value</th>
                <th className="px-4 text-right">Brokerage %</th>
                <th className="px-4 text-right">Brokerage ₹</th>
                <th className="px-4 text-right">TDS (194H)</th>
                <th className="px-4 text-right">Net payable</th>
                <th className="px-4">Status</th>
                {role === 'Admin' && <th className="px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] t-13">
              {visibleBookings.map((bkg) => {
                const proj = projects.find((p) => p.id === bkg.projectId);
                const unit = units.find((u) => u.id === bkg.unitId);
                const lead = leads.find((l) => l.id === bkg.leadId);
                const brk = brokers.find((b) => b.id === bkg.brokerId);
                const tdsInr = Math.round(bkg.commissionAmountInr * 0.05);
                const netInr = bkg.commissionAmountInr - tdsInr;

                return (
                  <tr
                    key={bkg.id}
                    className="h-11 hover:bg-[var(--subtle)] transition-colors"
                  >
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        {proj && (
                          <ProjectChip projectId={proj.id} name={proj.name} />
                        )}
                        <span className="text-[var(--text-primary)] t-mono font-medium">
                          Unit {unit?.unitNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 text-[var(--text-secondary)]">
                      {lead?.buyerName || 'Allotted buyer'}
                    </td>
                    <td className="px-4">
                      <span className="text-[var(--text-primary)]">
                        {brk?.name}
                      </span>
                      <span className="text-[var(--text-tertiary)]">
                        {' '}
                        · {brk?.firmName}
                      </span>
                    </td>
                    <td
                      className="px-4 text-right t-mono text-[var(--text-primary)]"
                      title={formatInrFull(bkg.agreementValueInr)}
                    >
                      {formatInr(bkg.agreementValueInr)}
                    </td>
                    <td className="px-4 text-right t-mono text-[var(--text-secondary)]">
                      {formatPct(bkg.commissionPct)}
                    </td>
                    <td
                      className="px-4 text-right t-mono text-[var(--text-primary)]"
                      title={formatInrFull(bkg.commissionAmountInr)}
                    >
                      {formatInr(bkg.commissionAmountInr)}
                    </td>
                    <td
                      className="px-4 text-right t-mono text-[var(--text-secondary)]"
                      title={formatInrFull(tdsInr)}
                    >
                      {formatInr(tdsInr)}
                    </td>
                    <td
                      className="px-4 text-right t-mono font-medium text-[var(--text-primary)]"
                      title={formatInrFull(netInr)}
                    >
                      {formatInr(netInr)}
                    </td>
                    <td className="px-4">
                      <CommissionStatusBadge status={bkg.commissionStatus} />
                    </td>
                    {role === 'Admin' && (
                      <td className="px-4 text-right">
                        {bkg.commissionStatus === 'Pending Approval' ? (
                          <button
                            type="button"
                            onClick={() => setConfirmBooking(bkg)}
                            className="btn-secondary btn-sm"
                          >
                            Approve invoice
                          </button>
                        ) : bkg.commissionStatus === 'Approved' ? (
                          <button
                            type="button"
                            onClick={() => setConfirmBooking(bkg)}
                            className="btn-accent btn-sm"
                          >
                            Release payout
                          </button>
                        ) : (
                          <span className="t-12 t-mono text-[var(--text-tertiary)]">
                            Settled
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row in Eclipse 800 mono */}
            <tfoot className="bg-[var(--subtle)] border-t border-[var(--border)] t-13 font-semibold">
              <tr className="h-11">
                <td colSpan={3} className="px-4 text-[var(--text-primary)]">
                  Total ({visibleBookings.length} tranches)
                </td>
                <td
                  className="px-4 text-right t-mono text-[var(--money-total)]"
                  title={formatInrFull(totalAgreementValueInr)}
                >
                  {formatInr(totalAgreementValueInr)}
                </td>
                <td className="px-4 text-right t-mono text-[var(--text-tertiary)]">
                  —
                </td>
                <td
                  className="px-4 text-right t-mono text-[var(--money-total)]"
                  title={formatInrFull(totalBrokerageInr)}
                >
                  {formatInr(totalBrokerageInr)}
                </td>
                <td
                  className="px-4 text-right t-mono text-[var(--money-total)]"
                  title={formatInrFull(totalTdsInr)}
                >
                  {formatInr(totalTdsInr)}
                </td>
                <td
                  className="px-4 text-right t-mono text-[var(--money-total)]"
                  title={formatInrFull(totalNetPayableInr)}
                >
                  {formatInr(totalNetPayableInr)}
                </td>
                <td colSpan={role === 'Admin' ? 2 : 1} className="px-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Approve Invoice / Release Payout */}
      {confirmBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setConfirmBooking(null)}
          />
          <div
            role="dialog"
            aria-label="Confirm finance action"
            className="relative z-10 w-full max-w-[480px] rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-eclipse p-4 sm:p-5 space-y-4"
          >
            {(() => {
              const brk = brokers.find((b) => b.id === confirmBooking.brokerId);
              const unit = units.find((u) => u.id === confirmBooking.unitId);
              const proj = projects.find(
                (p) => p.id === confirmBooking.projectId
              );
              const tds = Math.round(confirmBooking.commissionAmountInr * 0.05);
              const net = confirmBooking.commissionAmountInr - tds;
              const isApproving =
                confirmBooking.commissionStatus === 'Pending Approval';

              return (
                <>
                  <div>
                    <h2 className="t-16 text-[var(--text-primary)]">
                      {isApproving
                        ? `Approve ${formatInr(
                            confirmBooking.commissionAmountInr
                          )} invoice for ${brk?.name}?`
                        : `Release ${formatInr(net)} to ${brk?.name}?`}
                    </h2>
                    <p className="t-13 text-[var(--text-secondary)] mt-1">
                      {proj?.name} · Unit {unit?.unitNumber} · {brk?.firmName} (
                      <span className="t-mono">{brk?.reraId}</span>)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[6px] bg-[var(--subtle)] border border-[var(--border)] space-y-1.5 t-13">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-secondary)]">
                        Gross brokerage ({confirmBooking.commissionPct}%)
                      </span>
                      <span className="t-mono text-[var(--text-primary)]">
                        {formatInrFull(confirmBooking.commissionAmountInr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-secondary)]">
                        Less TDS under Sec 194H (5.0%)
                      </span>
                      <span className="t-mono text-[var(--status-blocked)]">
                        -{formatInrFull(tds)}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-[var(--border)] flex items-center justify-between gap-2 font-semibold">
                      <span className="text-[var(--text-primary)]">
                        Net disbursement
                      </span>
                      <span className="t-mono text-[var(--money-total)]">
                        {formatInrFull(net)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmBooking(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        advanceCommissionStatus(confirmBooking.id);
                        setConfirmBooking(null);
                      }}
                      className={isApproving ? 'btn-primary' : 'btn-accent'}
                    >
                      {isApproving ? 'Approve invoice' : 'Release payout'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminBrokersDirectoryView: React.FC = () => {
  const {
    brokers,
    leads,
    bookings,
    projects,
    units,
    setRole,
    setActiveBrokerId,
  } = useSolexStore();

  const [selectedBrokerDrawerId, setSelectedBrokerDrawerId] = useState<
    string | null
  >(null);

  const inspectedBroker = selectedBrokerDrawerId
    ? brokers.find((b) => b.id === selectedBrokerDrawerId)
    : null;

  // Determine top performer commission threshold for subtle ivory row tint
  const brokerCommissions = brokers.map((brk) =>
    bookings
      .filter((b) => b.brokerId === brk.id)
      .reduce((sum, b) => sum + b.commissionAmountInr, 0)
  );
  const maxCommission = Math.max(...brokerCommissions, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="t-22-title text-[var(--text-primary)]">Brokers</h1>
          <p className="t-13 text-[var(--text-secondary)] mt-0.5">
            RERA-empanelled channel partners, conversion performance, and commission attribution.
          </p>
        </div>
      </div>

      {/* Brokers Directory: Mobile Cards (<768px) + Desktop Table (>=768px) */}
      <div className="border border-[var(--border)] rounded-[10px] bg-[var(--surface)] overflow-hidden">
        {/* Mobile Broker Cards (< 768px) */}
        <div className="md:hidden divide-y divide-[var(--border)]">
          {brokers.map((brk) => {
            const brokerLeads = leads.filter(
              (l) => l.assignedBrokerId === brk.id
            );
            const activeLeadsCount = brokerLeads.filter(
              (l) => l.stage !== 'Booked'
            ).length;
            const siteVisitsCount = brokerLeads.filter(
              (l) =>
                l.stage === 'Site Visit' ||
                l.stage === 'Negotiation' ||
                l.stage === 'Booked'
            ).length;
            const brokerBookings = bookings.filter(
              (b) => b.brokerId === brk.id
            );
            const conversionPct =
              brokerLeads.length > 0
                ? (brokerBookings.length / brokerLeads.length) * 100
                : 0;
            const totalCommissionInr = brokerBookings.reduce(
              (sum, b) => sum + b.commissionAmountInr,
              0
            );
            const isTopPerformer =
              maxCommission > 0 && totalCommissionInr === maxCommission;

            return (
              <div
                key={brk.id}
                onClick={() => setSelectedBrokerDrawerId(brk.id)}
                style={{
                  backgroundColor: isTopPerformer
                    ? 'var(--ivory-band)'
                    : undefined,
                }}
                className="p-3.5 space-y-2.5 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="t-14-medium text-[var(--text-primary)] truncate">
                      {brk.firmName}
                    </div>
                    <div className="t-12 text-[var(--text-secondary)] mt-0.5">
                      {brk.name} ·{' '}
                      <span className="t-mono text-[var(--text-tertiary)]">
                        {brk.reraId}
                      </span>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] t-12 shrink-0"
                    style={{
                      backgroundColor: 'var(--status-available-tint)',
                      color: 'var(--status-available)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: 'var(--status-available)',
                      }}
                    />
                    <span>Active</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] t-12">
                  <div>
                    <div className="text-[var(--text-tertiary)]">
                      Active leads
                    </div>
                    <div className="t-mono text-[var(--text-primary)] mt-0.5">
                      {activeLeadsCount} ({siteVisitsCount} visits)
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)]">
                      Conversion
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-10 h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.min(100, Math.round(conversionPct))}%`,
                            backgroundColor: '#272757',
                          }}
                        />
                      </div>
                      <span className="t-mono text-[var(--text-primary)]">
                        {formatPct(conversionPct)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--text-tertiary)]">
                      Commission
                    </div>
                    <div className="t-mono font-semibold text-[var(--money-total)] mt-0.5">
                      {formatInr(totalCommissionInr)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop/Tablet Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--subtle)] border-b border-[var(--border)]">
              <tr className="h-9 text-[12px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4">Firm</th>
                <th className="px-4">RERA agent ID</th>
                <th className="px-4 text-right">Active leads</th>
                <th className="px-4 text-right">Site visits</th>
                <th className="px-4 text-right">Bookings</th>
                <th className="px-4 text-right">Conversion %</th>
                <th className="px-4 text-right">Commission earned (₹)</th>
                <th className="px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] t-13">
              {brokers.map((brk) => {
                const brokerLeads = leads.filter(
                  (l) => l.assignedBrokerId === brk.id
                );
                const activeLeadsCount = brokerLeads.filter(
                  (l) => l.stage !== 'Booked'
                ).length;
                const siteVisitsCount = brokerLeads.filter(
                  (l) =>
                    l.stage === 'Site Visit' ||
                    l.stage === 'Negotiation' ||
                    l.stage === 'Booked'
                ).length;
                const brokerBookings = bookings.filter(
                  (b) => b.brokerId === brk.id
                );
                const conversionPct =
                  brokerLeads.length > 0
                    ? (brokerBookings.length / brokerLeads.length) * 100
                    : 0;
                const totalCommissionInr = brokerBookings.reduce(
                  (sum, b) => sum + b.commissionAmountInr,
                  0
                );
                const isTopPerformer =
                  maxCommission > 0 && totalCommissionInr === maxCommission;

                return (
                  <tr
                    key={brk.id}
                    onClick={() => setSelectedBrokerDrawerId(brk.id)}
                    style={{
                      backgroundColor: isTopPerformer
                        ? 'var(--ivory-band)'
                        : undefined,
                    }}
                    className="h-11 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
                  >
                    <td className="px-4">
                      <span className="font-medium text-[var(--text-primary)]">
                        {brk.firmName}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {' '}
                        · {brk.name}
                      </span>
                    </td>
                    <td className="px-4 t-mono text-[var(--text-secondary)]">
                      {brk.reraId}
                    </td>
                    <td className="px-4 text-right t-mono text-[var(--text-primary)]">
                      {activeLeadsCount}
                    </td>
                    <td className="px-4 text-right t-mono text-[var(--text-primary)]">
                      {siteVisitsCount}
                    </td>
                    <td className="px-4 text-right t-mono text-[var(--text-primary)]">
                      {brokerBookings.length}
                    </td>
                    <td className="px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2 w-28">
                        <div className="w-12 h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(100, Math.round(conversionPct))}%`,
                              backgroundColor: '#272757',
                            }}
                          />
                        </div>
                        <span className="t-mono text-[var(--text-primary)]">
                          {formatPct(conversionPct)}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 text-right t-mono font-medium text-[var(--money-total)]"
                      title={formatInrFull(totalCommissionInr)}
                    >
                      {formatInr(totalCommissionInr)}
                    </td>
                    <td className="px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] t-12"
                        style={{
                          backgroundColor: 'var(--status-available-tint)',
                          color: 'var(--status-available)',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: 'var(--status-available)',
                          }}
                        />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broker Detail Drawer (480px Right) */}
      {inspectedBroker && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setSelectedBrokerDrawerId(null)}
          />
          <aside
            role="dialog"
            aria-label={inspectedBroker.firmName}
            className="drawer-enter relative z-50 w-full max-w-[480px] bg-[var(--surface)] h-[100dvh] border-l border-[var(--border)] shadow-eclipse flex flex-col justify-between overflow-y-auto"
          >
            {(() => {
              const brokerLeads = leads.filter(
                (l) => l.assignedBrokerId === inspectedBroker.id
              );
              const brokerBookings = bookings.filter(
                (b) => b.brokerId === inspectedBroker.id
              );
              const totalSalesInr = brokerBookings.reduce(
                (sum, b) => sum + b.agreementValueInr,
                0
              );
              const totalCommInr = brokerBookings.reduce(
                (sum, b) => sum + b.commissionAmountInr,
                0
              );

              return (
                <>
                  <div className="divide-y divide-[var(--border)]">
                    <div
                      className="p-4 sm:p-5 flex items-start justify-between gap-4 border-b sticky top-0 z-10"
                      style={{
                        backgroundColor: 'var(--ivory-band)',
                        borderColor: 'var(--ivory-band-border)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="t-12 t-mono text-[var(--text-secondary)]">
                          {inspectedBroker.reraId} · {inspectedBroker.city}
                        </div>
                        <h2 className="t-22-title text-[var(--text-primary)] mt-1 truncate">
                          {inspectedBroker.firmName}
                        </h2>
                        <div className="t-13 text-[var(--text-secondary)] mt-0.5">
                          Principal partner: {inspectedBroker.name} ·{' '}
                          <span className="t-mono">{inspectedBroker.phone}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBrokerDrawerId(null)}
                        className="btn-ghost btn-sm px-2 shrink-0"
                        aria-label="Close broker drawer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Performance Summary */}
                    <div className="p-4 sm:p-5 grid grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <div className="t-12 text-[var(--text-tertiary)]">
                          Leads
                        </div>
                        <div className="t-16 t-mono text-[var(--text-primary)] mt-0.5">
                          {brokerLeads.length}
                        </div>
                      </div>
                      <div>
                        <div className="t-12 text-[var(--text-tertiary)]">
                          Gross sales
                        </div>
                        <div
                          className="t-16 t-mono text-[var(--text-primary)] mt-0.5"
                          title={formatInrFull(totalSalesInr)}
                        >
                          {formatInr(totalSalesInr)}
                        </div>
                      </div>
                      <div>
                        <div className="t-12 text-[var(--text-tertiary)]">
                          Commission
                        </div>
                        <div
                          className="t-16 t-mono text-[var(--money-total)] mt-0.5"
                          title={formatInrFull(totalCommInr)}
                        >
                          {formatInr(totalCommInr)}
                        </div>
                      </div>
                    </div>

                    {/* Recent Deals */}
                    <div className="p-4 sm:p-5">
                      <div className="mb-3">
                        <SectionTitle>
                          Recent deals ({brokerBookings.length})
                        </SectionTitle>
                      </div>
                      {brokerBookings.length === 0 ? (
                        <div className="t-13 text-[var(--text-tertiary)]">
                          No confirmed bookings recorded yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-[var(--border)]">
                          {brokerBookings.map((bkg) => {
                            const proj = projects.find(
                              (p) => p.id === bkg.projectId
                            );
                            const unit = units.find((u) => u.id === bkg.unitId);
                            const lead = leads.find((l) => l.id === bkg.leadId);
                            return (
                              <div
                                key={bkg.id}
                                className="py-2.5 flex items-center justify-between gap-3 t-13"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-[var(--text-primary)] truncate">
                                    {proj?.name} ·{' '}
                                    <span className="t-mono">
                                      Unit {unit?.unitNumber}
                                    </span>
                                  </div>
                                  <div className="t-12 text-[var(--text-secondary)] truncate">
                                    {lead?.buyerName} ·{' '}
                                    <span className="t-mono">
                                      {formatShortDate(bkg.bookedAt)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="t-mono text-[var(--text-primary)]">
                                    {formatInr(bkg.commissionAmountInr)}
                                  </div>
                                  <CommissionStatusBadge
                                    status={bkg.commissionStatus}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sticky bottom-0 p-4 border-t border-[var(--border)] bg-[var(--subtle)] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedBrokerDrawerId(null)}
                      className="btn-secondary"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBrokerId(inspectedBroker.id);
                        setSelectedBrokerDrawerId(null);
                        setRole('Broker');
                      }}
                      className="btn-primary"
                    >
                      View as {inspectedBroker.name}
                    </button>
                  </div>
                </>
              );
            })()}
          </aside>
        </div>
      )}
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
    <div className="space-y-4">
      <div>
        <h1 className="t-22-title text-[var(--text-primary)]">Architecture</h1>
        <p className="t-13 text-[var(--text-secondary)] mt-0.5">
          Developer reference for `/ARCHITECTURE.md` and Supabase schema.
        </p>
      </div>

      <div className="p-4 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] overflow-x-auto">
        <pre className="t-12 t-mono leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
          {markdown}
        </pre>
      </div>
    </div>
  );
};

export const BrokerPortalView: React.FC<{
  subScreen: 'overview' | 'leads' | 'commissions';
}> = ({ subScreen }) => {
  const {
    activeBrokerId,
    brokers,
    leads,
    bookings,
    units,
    setActiveScreen,
  } = useSolexStore();

  const activeBroker =
    brokers.find((b) => b.id === activeBrokerId) || brokers[0];
  const myLeads = leads.filter((l) => l.assignedBrokerId === activeBroker.id);
  const myActiveLeads = myLeads.filter((l) => l.stage !== 'Booked');
  const myHolds = units.filter(
    (u) =>
      u.status === 'Hold' &&
      myLeads.some((l) => l.id === u.heldByLeadId)
  );
  const myBookings = bookings.filter((b) => b.brokerId === activeBroker.id);

  const pendingComm = myBookings
    .filter((b) => b.commissionStatus === 'Pending Approval')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);
  const approvedComm = myBookings
    .filter((b) => b.commissionStatus === 'Approved')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);
  const paidComm = myBookings
    .filter((b) => b.commissionStatus === 'Released')
    .reduce((sum, b) => sum + b.commissionAmountInr, 0);
  const availableUnitsCount = units.filter(
    (u) => u.status === 'Available'
  ).length;

  if (subScreen === 'leads') {
    return <LeadPipelineView />;
  }
  if (subScreen === 'commissions') {
    return <BrokerCommissionsView />;
  }

  return (
    <div className="space-y-6">
      {/* Ink-Wash Overview Header Band */}
      <div className="ink-wash-band rounded-[10px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="t-22-title text-[var(--text-primary)]">Overview</h1>
          <p className="t-13 text-[var(--text-secondary)] mt-0.5">
            {activeBroker.firmName} · RERA{' '}
            <span className="t-mono">{activeBroker.reraId}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen('projects')}
          className="btn-secondary"
        >
          <span>Available inventory ({availableUnitsCount})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Needs Action Strip */}
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
        <div className="px-4 h-11 flex items-center justify-between t-13">
          <span className="text-[var(--text-primary)]">
            My leads needing action
          </span>
          <button
            type="button"
            onClick={() => setActiveScreen('broker-leads')}
            className="t-12 t-mono text-[var(--accent)] hover:underline cursor-pointer"
          >
            {myActiveLeads.length} active →
          </button>
        </div>
        <div className="px-4 h-11 flex items-center justify-between t-13">
          <span className="text-[var(--text-primary)]">Holds expiring</span>
          <button
            type="button"
            onClick={() => setActiveScreen('projects')}
            className="t-12 t-mono text-[var(--accent)] hover:underline cursor-pointer"
          >
            {myHolds.length} on hold →
          </button>
        </div>
      </div>

      {/* My Commissions (Pending / Approved / Paid Tinted Chips) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <SectionTitle>My commissions</SectionTitle>
          <button
            type="button"
            onClick={() => setActiveScreen('broker-commissions')}
            className="t-12 text-[var(--accent)] hover:underline cursor-pointer"
          >
            Open ledger →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--border)] rounded-[10px] bg-[var(--surface)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] overflow-hidden">
          <div className="p-4">
            <span
              className="inline-flex px-2 py-0.5 rounded-[6px] t-12"
              style={{
                backgroundColor: 'var(--status-hold-tint)',
                color: 'var(--status-hold)',
              }}
            >
              Pending
            </span>
            <div className="t-28 text-[var(--money-total)] mt-2">
              {formatInr(pendingComm)}
            </div>
          </div>
          <div className="p-4">
            <span
              className="inline-flex px-2 py-0.5 rounded-[6px] t-12"
              style={{
                backgroundColor: 'var(--status-booked-tint)',
                color: 'var(--status-booked)',
              }}
            >
              Approved
            </span>
            <div className="t-28 text-[var(--money-total)] mt-2">
              {formatInr(approvedComm)}
            </div>
          </div>
          <div className="p-4">
            <span
              className="inline-flex px-2 py-0.5 rounded-[6px] t-12"
              style={{
                backgroundColor: 'var(--status-sold-tint)',
                color: 'var(--status-sold)',
              }}
            >
              Paid
            </span>
            <div className="t-28 text-[var(--text-primary)] mt-2">
              {formatInr(paidComm)}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Lead Pipeline */}
      <LeadPipelineView />
    </div>
  );
};
