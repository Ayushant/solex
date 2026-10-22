import React, { useEffect, useState } from 'react';
import {
  useSolexStore,
  getUnitAllInclusivePrice,
  formatInrCompact,
} from '../store/useSolexStore';
import {
  X,
  CheckCircle2,
  UserCheck,
  Building2,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

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
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-skyline');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('brk-rahul');
  const [bookingNotes, setBookingNotes] = useState<string>(
    '10% Booking Token Cheque / RTGS Verified'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter eligible leads (unbooked leads, scoped to broker if role === 'Broker')
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
  }, [bookingModal.isOpen, bookingModal.preselectedLeadId, bookingModal.preselectedUnitId, bookingModal.preselectedProjectId]);

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
        projUnits.find((u) => u.id === chosenLead.preferredUnitId) || projUnits[0];
      if (preferred) setSelectedUnitId(preferred.id);
    }
  };

  const handleConfirmBooking = () => {
    if (!selectedLeadId || !selectedUnitId || !selectedBrokerId) {
      setErrorMsg('Please complete all required selections before confirming.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/55 transition-opacity"
        onClick={closeBookingModal}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] sm:text-xs text-indigo-300 font-medium">
              Atomic Mandate Transaction · Pessimistic Row Lock Active
            </div>
            <h2 className="text-base sm:text-lg font-bold mt-0.5">
              Convert Lead to Confirmed Unit Booking
            </h2>
          </div>
          <button
            type="button"
            onClick={closeBookingModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { num: 1, label: '1. Select Lead', icon: UserCheck },
            { num: 2, label: '2. Select Unit', icon: Building2 },
            { num: 3, label: '3. Assign Broker', icon: Briefcase },
            { num: 4, label: '4. Confirm Deal', icon: ShieldCheck },
          ].map((item) => {
            const active = step === item.num;
            const completed = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStep(item.num as 1 | 2 | 3 | 4)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : completed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: SELECT LEAD */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 1: Select Qualified Buyer Lead
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the active buyer lead to convert into a confirmed unit allotment.
                </p>
              </div>

              {eligibleLeads.length === 0 ? (
                <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center text-sm text-slate-600">
                  All leads in your current view are already booked. Register a new lead first.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {eligibleLeads.map((lead) => {
                    const proj = projects.find((p) => p.id === lead.projectId);
                    const brk = brokers.find((b) => b.id === lead.assignedBrokerId);
                    const isSelected = lead.id === selectedLeadId;
                    return (
                      <div
                        key={lead.id}
                        onClick={() => handleLeadSelect(lead.id)}
                        className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {lead.buyerName}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-medium text-indigo-600">
                              {lead.stage}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {proj?.name} · Looking for {lead.interestedBhk} · Budget{' '}
                            <span className="font-mono font-semibold text-slate-700">
                              {formatInrCompact(lead.budgetInr)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Attributed CP: {brk?.name} ({brk?.firmName})
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT AVAILABLE UNIT */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Step 2: Select Available Apartment Unit
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sold units are locked. Selecting a unit places an immediate transaction lock.
                  </p>
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
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {availableUnitsForProject.map((u) => {
                  const isSelected = u.id === selectedUnitId;
                  const price = getUnitAllInclusivePrice(u);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUnitId(u.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                          : u.status === 'Hold'
                          ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                          : 'border-slate-200 bg-white hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          Unit {u.unitNumber}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            u.status === 'Available'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">{u.bhk}</div>
                      <div className="text-xs font-mono font-semibold text-slate-900 mt-1">
                        {formatInrCompact(price)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Floor {u.floor} · {u.carpetAreaSqFt} sq.ft
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: ASSIGN CHANNEL PARTNER */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 3: Assign Channel Partner (Broker Attribution)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigning a RERA-registered Channel Partner triggers automatic commission calculation ({commissionPct}% of Agreement Value).
                </p>
              </div>

              <div className="space-y-2.5">
                {brokers.map((brk) => {
                  const isSelected = brk.id === selectedBrokerId;
                  const isDisabled = role === 'Broker' && brk.id !== activeBrokerId;
                  return (
                    <button
                      key={brk.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedBrokerId(brk.id)}
                      className={`w-full p-4 rounded-lg border text-left transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600 cursor-pointer'
                          : isDisabled
                          ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {brk.name}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-medium text-slate-700">
                            {brk.firmName}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-semibold text-indigo-600">
                            {brk.tier} Partner
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">
                          RERA: {brk.reraId} · {brk.city}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-500">Payout ({commissionPct}%)</div>
                        <div className="text-sm font-bold font-mono text-indigo-700">
                          {formatInrCompact(commissionInr)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Step 4: Final Verification & Atomic State Commit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirming will mark Unit {currentUnit?.unitNumber} as Sold, update Command Centre KPIs, and credit the broker ledger.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-slate-500">Buyer Lead</span>
                  <span className="font-semibold text-slate-900">
                    {currentLead?.buyerName} ({currentLead?.phone})
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-slate-500">Project & Unit</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {currentProject?.name} · Unit {currentUnit?.unitNumber} ({currentUnit?.bhk})
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-slate-500">All-Inclusive Agreement Value</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatInrCompact(agreementValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-slate-500">Attributed Channel Partner</span>
                  <span className="font-semibold text-slate-900">
                    {currentBroker?.name} ({currentBroker?.firmName})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Brokerage Commission Queued ({commissionPct}%)</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {formatInrCompact(commissionInr)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment & Allotment Reference Note
                </label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter cheque / RTGS reference..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Step</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={closeBookingModal}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={!selectedLeadId || !selectedUnitId}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Continue to Step {step + 1}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmBooking}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Booking & Lock Unit {currentUnit?.unitNumber}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
