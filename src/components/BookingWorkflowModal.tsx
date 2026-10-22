import React, { useEffect, useState } from 'react';
import {
  useSolexStore,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import {
  formatInr,
  formatInrFull,
  formatArea,
  UnitStatusBadge,
} from '../lib/formatters';
import { X, AlertCircle } from 'lucide-react';

export const BookingWorkflowModal: React.FC = () => {
  const {
    bookingModal,
    closeBookingModal,
    leads,
    units,
    projects,
    brokers,
    role,
    activeBrokerId,
    convertLeadToBooking,
  } = useSolexStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] =
    useState<string>('proj-skyline');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('brk-rahul');
  const [bookingNotes, setBookingNotes] = useState<string>(
    '10% booking token verified'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const eligibleLeads = leads.filter(
    (l) =>
      l.stage !== 'Booked' &&
      (role === 'Admin' || l.assignedBrokerId === activeBrokerId)
  );

  useEffect(() => {
    if (!bookingModal.isOpen) return;
    setErrorMsg(null);
    setStep(1);

    const initialLead =
      eligibleLeads.find((l) => l.id === bookingModal.preselectedLeadId) ||
      eligibleLeads[0];

    const projId =
      bookingModal.preselectedProjectId ||
      initialLead?.projectId ||
      'proj-skyline';

    setSelectedLeadId(initialLead?.id || '');
    setSelectedProjectId(projId);

    const availableInProj = units.filter(
      (u) => u.projectId === projId && u.status !== 'Sold'
    );
    const initialUnit =
      availableInProj.find((u) => u.id === bookingModal.preselectedUnitId) ||
      availableInProj.find((u) => u.id === initialLead?.preferredUnitId) ||
      availableInProj[0];

    setSelectedUnitId(initialUnit?.id || '');
    setSelectedBrokerId(
      role === 'Broker'
        ? activeBrokerId
        : initialLead?.assignedBrokerId || 'brk-rahul'
    );
  }, [
    bookingModal.isOpen,
    bookingModal.preselectedLeadId,
    bookingModal.preselectedUnitId,
    bookingModal.preselectedProjectId,
  ]);

  if (!bookingModal.isOpen) return null;

  const currentLead = leads.find((l) => l.id === selectedLeadId);
  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const availableUnitsForProject = units.filter(
    (u) => u.projectId === selectedProjectId && u.status !== 'Sold'
  );
  const currentUnit = units.find((u) => u.id === selectedUnitId);
  const currentBroker = brokers.find((b) => b.id === selectedBrokerId);

  const agreementValue = currentUnit ? getUnitAllInclusivePrice(currentUnit) : 0;
  const commissionPct = currentProject?.brokerSharePct ?? 2.0;
  const commissionInr = Math.round((agreementValue * commissionPct) / 100);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    const chosenLead = leads.find((l) => l.id === leadId);
    if (chosenLead) {
      setSelectedProjectId(chosenLead.projectId);
      setSelectedBrokerId(chosenLead.assignedBrokerId);
      const projUnits = units.filter(
        (u) => u.projectId === chosenLead.projectId && u.status !== 'Sold'
      );
      const preferred =
        projUnits.find((u) => u.id === chosenLead.preferredUnitId) ||
        projUnits[0];
      if (preferred) setSelectedUnitId(preferred.id);
    }
  };

  const handleConfirmBooking = () => {
    if (!selectedLeadId || !selectedUnitId || !selectedBrokerId) {
      setErrorMsg('Select a buyer lead, unit, and channel partner to continue.');
      return;
    }
    const res = convertLeadToBooking({
      leadId: selectedLeadId,
      unitId: selectedUnitId,
      brokerId: selectedBrokerId,
      bookingNotes,
    });
    if (!res.success) {
      setErrorMsg(res.error || 'Could not complete booking.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={closeBookingModal}
      />

      <div
        role="dialog"
        aria-label="Convert lead to booking"
        className="relative z-10 w-full max-w-[640px] rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-eclipse overflow-hidden flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="t-16 text-[var(--text-primary)]">
              Convert to booking
            </h2>
            <p className="t-12 text-[var(--text-tertiary)] mt-0.5 truncate">
              Lock unit inventory, allot buyer, and record channel partner brokerage.
            </p>
          </div>
          <button
            type="button"
            onClick={closeBookingModal}
            className="btn-ghost btn-sm px-2 shrink-0"
            aria-label="Close booking dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-3.5 sm:px-5 py-2 bg-[var(--subtle)] border-b border-[var(--border)] grid grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { num: 1, label: '1. Buyer' },
            { num: 2, label: '2. Unit' },
            { num: 3, label: '3. Broker' },
            { num: 4, label: '4. Confirm' },
          ].map((item) => {
            const active = step === item.num;
            const completed = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStep(item.num as 1 | 2 | 3 | 4)}
                className={`h-7 px-1.5 sm:px-2.5 rounded-[6px] text-[11px] sm:text-[12px] text-left truncate transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border-strong)] font-medium'
                    : completed
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div
              className="p-3 rounded-[6px] border t-12 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--status-blocked-tint)',
                borderColor: 'var(--status-blocked-border)',
                color: 'var(--status-blocked)',
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="t-13-medium text-[var(--text-primary)]">
                Select buyer lead
              </div>

              {eligibleLeads.length === 0 ? (
                <div className="py-6 t-13 text-[var(--text-secondary)]">
                  All leads in your scope are already booked.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[6px] max-h-72 overflow-y-auto">
                  {eligibleLeads.map((lead) => {
                    const proj = projects.find((p) => p.id === lead.projectId);
                    const brk = brokers.find(
                      (b) => b.id === lead.assignedBrokerId
                    );
                    const isSelected = lead.id === selectedLeadId;
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => handleLeadSelect(lead.id)}
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--ivory-band)'
                            : undefined,
                        }}
                        className="w-full p-3 text-left flex items-center justify-between gap-3 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="t-13-medium text-[var(--text-primary)]">
                            {lead.buyerName}{' '}
                            <span className="t-12 text-[var(--text-tertiary)] font-normal">
                              · {lead.stage}
                            </span>
                          </div>
                          <div className="t-12 text-[var(--text-secondary)] mt-0.5">
                            {proj?.name} · {lead.interestedBhk} ·{' '}
                            {brk?.firmName}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="t-13 t-mono text-[var(--text-primary)]">
                            {formatInr(lead.budgetInr)}
                          </div>
                          {isSelected && (
                            <span className="t-12 text-[var(--accent)]">
                              Selected
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="t-13-medium text-[var(--text-primary)]">
                  Select unit
                </div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    const nextProj = e.target.value;
                    setSelectedProjectId(nextProj);
                    const firstAvail = units.find(
                      (u) => u.projectId === nextProj && u.status !== 'Sold'
                    );
                    setSelectedUnitId(firstAvail?.id || '');
                  }}
                  className="input-control w-auto"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                {availableUnitsForProject.map((u) => {
                  const isSelected = u.id === selectedUnitId;
                  const price = getUnitAllInclusivePrice(u);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUnitId(u.id)}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--ivory-band)'
                          : undefined,
                      }}
                      className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent)]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="t-13-medium t-mono text-[var(--text-primary)]">
                          Unit {u.unitNumber}
                        </span>
                        <UnitStatusBadge status={u.status} />
                      </div>
                      <div className="t-12 text-[var(--text-secondary)] mt-1">
                        {u.bhk} · {formatArea(u.carpetAreaSqFt)}
                      </div>
                      <div className="t-13 t-mono text-[var(--text-primary)] mt-1">
                        {formatInr(price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="t-13-medium text-[var(--text-primary)]">
                Channel partner attribution ({commissionPct.toFixed(1)}%)
              </div>
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[6px]">
                {brokers.map((brk) => {
                  const isSelected = brk.id === selectedBrokerId;
                  const isDisabled =
                    role === 'Broker' && brk.id !== activeBrokerId;
                  return (
                    <button
                      key={brk.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedBrokerId(brk.id)}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--ivory-band)'
                          : undefined,
                      }}
                      className={`w-full p-3 text-left flex items-center justify-between gap-3 transition-colors ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-[var(--subtle)] cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="t-13-medium text-[var(--text-primary)]">
                          {brk.firmName} · {brk.name}
                        </div>
                        <div className="t-12 t-mono text-[var(--text-tertiary)] mt-0.5">
                          {brk.reraId} · {brk.city}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="t-13 t-mono text-[var(--text-primary)]">
                          {formatInr(commissionInr)}
                        </div>
                        {isSelected && (
                          <span className="t-12 text-[var(--accent)]">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-[6px] bg-[var(--subtle)] border border-[var(--border)] space-y-2 t-13">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Buyer</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {currentLead?.buyerName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    Project & unit
                  </span>
                  <span className="t-mono text-[var(--text-primary)]">
                    {currentProject?.name} · Unit {currentUnit?.unitNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    Agreement value
                  </span>
                  <span
                    className="t-mono text-[var(--money-total)] font-medium"
                    title={formatInrFull(agreementValue)}
                  >
                    {formatInr(agreementValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    Channel partner
                  </span>
                  <span className="text-[var(--text-primary)]">
                    {currentBroker?.firmName}
                  </span>
                </div>
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between font-medium">
                  <span className="text-[var(--text-primary)]">
                    Brokerage ({commissionPct.toFixed(1)}%)
                  </span>
                  <span
                    className="t-mono text-[var(--money-total)]"
                    title={formatInrFull(commissionInr)}
                  >
                    {formatInr(commissionInr)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block t-12 text-[var(--text-secondary)] mb-1">
                  Payment reference
                </label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="input-control"
                  placeholder="Cheque / RTGS reference..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[var(--subtle)] border-t border-[var(--border)] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="btn-secondary"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={closeBookingModal}
              className="btn-secondary"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={!selectedLeadId || !selectedUnitId}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              className="btn-primary"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmBooking}
              className="btn-accent"
            >
              Book unit {currentUnit?.unitNumber}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
