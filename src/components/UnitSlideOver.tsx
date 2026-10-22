import React, { useState } from 'react';
import {
  useSolexStore,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import {
  formatInr,
  formatInrFull,
  formatArea,
  UnitStatusBadge,
  SectionTitle,
} from '../lib/formatters';
import { X } from 'lucide-react';

export const UnitSlideOver: React.FC = () => {
  const {
    selectedUnitId,
    setSelectedUnitId,
    units,
    projects,
    leads,
    brokers,
    updateUnitStatus,
    openBookingModal,
  } = useSolexStore();

  const [confirmingHold, setConfirmingHold] = useState(false);

  if (!selectedUnitId) return null;

  const unit = units.find((u) => u.id === selectedUnitId);
  if (!unit) return null;

  const project = projects.find((p) => p.id === unit.projectId);
  const heldLead = unit.heldByLeadId
    ? leads.find((l) => l.id === unit.heldByLeadId)
    : undefined;
  const bookedLead = unit.bookedByLeadId
    ? leads.find((l) => l.id === unit.bookedByLeadId)
    : undefined;
  const bookedBroker = unit.bookedByBrokerId
    ? brokers.find((b) => b.id === unit.bookedByBrokerId)
    : undefined;

  const agreementValue = getUnitAllInclusivePrice(unit);
  const gstEstimate = Math.round(agreementValue * 0.05);
  const stampDutyEstimate = Math.round(agreementValue * 0.06);
  const totalOutflow = agreementValue + gstEstimate + stampDutyEstimate;
  const estimatedBrokerCommission = Math.round(
    (agreementValue * (project?.brokerSharePct ?? 2.0)) / 100
  );

  const isExpiredHold = unit.status === 'Hold' && unit.floor % 7 === 0;
  const holdTimerLabel = isExpiredHold
    ? 'Hold expired 2h ago'
    : `Hold ends in ${(unit.floor % 9) + 2}h ${(unit.carpetAreaSqFt % 45) + 10}m`;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={() => {
          setConfirmingHold(false);
          setSelectedUnitId(null);
        }}
      />

      {/* 480px Right Drawer */}
      <aside
        role="dialog"
        aria-label={`Unit ${unit.unitNumber} details`}
        className="drawer-enter relative z-50 w-full max-w-[480px] bg-[var(--surface)] h-full border-l border-[var(--border)] shadow-eclipse flex flex-col justify-between overflow-y-auto"
      >
        <div className="divide-y divide-[var(--border)]">
          {/* Ivory Header Strip */}
          <div
            className="p-5 flex items-start justify-between gap-4 border-b"
            style={{
              backgroundColor: 'var(--ivory-band)',
              borderColor: 'var(--ivory-band-border)',
            }}
          >
            <div>
              <div className="t-12 text-[var(--text-secondary)] flex items-center gap-1.5">
                <span>{project?.name}</span>
                <span>·</span>
                <span>{unit.wing}</span>
                <span>·</span>
                <span className="t-mono">Floor {unit.floor}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="t-22-title text-[var(--text-primary)] t-mono">
                  Unit {unit.unitNumber}
                </h2>
                <UnitStatusBadge status={unit.status} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setConfirmingHold(false);
                setSelectedUnitId(null);
              }}
              className="btn-ghost btn-sm px-2"
              aria-label="Close unit drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Hold timer banner if on Hold */}
          {unit.status === 'Hold' && (
            <div className="px-5 py-3 bg-[var(--subtle)] flex items-center justify-between gap-3">
              <div className="t-13 text-[var(--text-secondary)]">
                {heldLead
                  ? `Held for ${heldLead.buyerName}`
                  : '24h inventory hold active'}
              </div>
              <span
                className={`t-12 t-mono ${
                  isExpiredHold
                    ? 'text-[var(--status-blocked)]'
                    : 'text-[var(--status-hold)]'
                }`}
              >
                {holdTimerLabel}
              </span>
            </div>
          )}

          {/* Unit Specs */}
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="t-12 text-[var(--text-tertiary)]">
                  Configuration
                </div>
                <div className="t-13-medium text-[var(--text-primary)] mt-0.5">
                  {unit.bhk}
                </div>
              </div>
              <div>
                <div className="t-12 text-[var(--text-tertiary)]">
                  Carpet area
                </div>
                <div className="t-13-medium text-[var(--text-primary)] t-mono mt-0.5">
                  {formatArea(unit.carpetAreaSqFt)}
                </div>
              </div>
              <div>
                <div className="t-12 text-[var(--text-tertiary)]">
                  Orientation
                </div>
                <div className="t-13-medium text-[var(--text-primary)] mt-0.5">
                  {unit.facing}
                </div>
              </div>
            </div>
          </div>

          {/* Cost Sheet (Total in Eclipse 800) */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Cost sheet</SectionTitle>
              <span className="t-12 t-mono text-[var(--text-tertiary)]">
                v{unit.version}.0
              </span>
            </div>

            <div className="space-y-2 t-13">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Base price ({formatArea(unit.carpetAreaSqFt)})
                </span>
                <span
                  className="t-mono text-[var(--text-primary)] text-right"
                  title={formatInrFull(unit.basePriceInr)}
                >
                  {formatInr(unit.basePriceInr)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Preferential location charge (PLC)
                </span>
                <span
                  className="t-mono text-[var(--text-primary)] text-right"
                  title={formatInrFull(unit.plcInr)}
                >
                  {formatInr(unit.plcInr)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Floor rise (Floor {unit.floor})
                </span>
                <span
                  className="t-mono text-[var(--text-primary)] text-right"
                  title={formatInrFull(unit.floorRiseInr)}
                >
                  {formatInr(unit.floorRiseInr)}
                </span>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between font-medium">
                <span className="text-[var(--text-primary)]">
                  Agreement value
                </span>
                <span
                  className="t-mono text-[var(--text-primary)] text-right"
                  title={formatInrFull(agreementValue)}
                >
                  {formatInr(agreementValue)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">GST (5.0%)</span>
                <span
                  className="t-mono text-[var(--text-primary)] text-right"
                  title={formatInrFull(gstEstimate)}
                >
                  {formatInr(gstEstimate)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Stamp duty estimate (6.0%)
                </span>
                <span
                  className="t-mono text-[var(--text-primary)] text-right"
                  title={formatInrFull(stampDutyEstimate)}
                >
                  {formatInr(stampDutyEstimate)}
                </span>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between font-semibold">
                <span className="text-[var(--text-primary)]">Total</span>
                <span
                  className="t-16 t-mono text-[var(--money-total)] text-right"
                  title={formatInrFull(totalOutflow)}
                >
                  {formatInr(totalOutflow)}
                </span>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[var(--text-secondary)]">
                <span>
                  Channel partner share (
                  {(project?.brokerSharePct ?? 2).toFixed(1)}%)
                </span>
                <span
                  className="t-mono text-[var(--text-primary)] text-right"
                  title={formatInrFull(estimatedBrokerCommission)}
                >
                  {formatInr(estimatedBrokerCommission)}
                </span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="p-5">
            <div className="mb-3">
              <SectionTitle>Status history</SectionTitle>
            </div>
            <div className="space-y-2.5 t-13">
              {unit.status === 'Sold' && (
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="text-[var(--text-primary)] font-medium">
                      Booked
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {' '}
                      ·{' '}
                      {bookedLead
                        ? bookedLead.buyerName
                        : 'Direct allotment'}{' '}
                      ({bookedBroker ? bookedBroker.firmName : 'soleX Direct'})
                    </span>
                  </div>
                  <span className="t-12 t-mono text-[var(--text-tertiary)] shrink-0">
                    21 Oct, 14:30
                  </span>
                </div>
              )}

              {unit.status === 'Hold' && (
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="text-[var(--text-primary)] font-medium">
                      Placed on 24h hold
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {' '}
                      · {heldLead ? heldLead.buyerName : 'Desk verification'}
                    </span>
                  </div>
                  <span className="t-12 t-mono text-[var(--text-tertiary)] shrink-0">
                    22 Oct, 10:15
                  </span>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <span className="text-[var(--text-primary)]">
                    Released to mandate inventory
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {' '}
                    · Rev v1.0
                  </span>
                </div>
                <span className="t-12 t-mono text-[var(--text-tertiary)] shrink-0">
                  01 Oct, 09:00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: "Hold 24h" (secondary) / "Book unit" (accent Eclipse 600) */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--subtle)]">
          {unit.status !== 'Sold' ? (
            confirmingHold ? (
              <div className="flex items-center justify-between gap-3">
                <span className="t-13-medium text-[var(--text-primary)]">
                  Hold unit {unit.unitNumber} for 24h?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingHold(false)}
                    className="btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateUnitStatus(unit.id, 'Hold');
                      setConfirmingHold(false);
                    }}
                    className="btn-primary btn-sm"
                  >
                    Confirm hold
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2">
                {unit.status === 'Available' ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingHold(true)}
                    className="btn-secondary"
                  >
                    Hold 24h
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateUnitStatus(unit.id, 'Available')}
                    className="btn-secondary"
                  >
                    Release hold
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const targetUnitId = unit.id;
                    const targetProjectId = unit.projectId;
                    const presetLeadId = unit.heldByLeadId;
                    setSelectedUnitId(null);
                    openBookingModal({
                      unitId: targetUnitId,
                      projectId: targetProjectId,
                      leadId: presetLeadId,
                    });
                  }}
                  className="btn-accent"
                >
                  Book unit
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between">
              <span className="t-12 text-[var(--text-tertiary)]">
                Unit is allotted and locked
              </span>
              <button
                type="button"
                onClick={() => setSelectedUnitId(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
