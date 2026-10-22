import React from 'react';
import {
  useSolexStore,
  getUnitAllInclusivePrice,
  formatInrCompact,
} from '../store/useSolexStore';
import {
  X,
  Building2,
  Compass,
  Maximize2,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={() => setSelectedUnitId(null)}
      />

      {/* Right Slide-Over Panel */}
      <aside className="relative z-50 w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Top Header */}
          <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{project?.name}</span>
                <span>·</span>
                <span>{unit.wing}</span>
                <span>·</span>
                <span>Floor {unit.floor}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-2xl font-bold text-slate-900 font-mono">
                  Unit {unit.unitNumber}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                    unit.status === 'Available'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : unit.status === 'Hold'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {unit.status === 'Available' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {unit.status === 'Hold' && <Clock className="w-3.5 h-3.5" />}
                  {unit.status === 'Sold' && <Lock className="w-3.5 h-3.5" />}
                  <span>{unit.status}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedUnitId(null)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close unit inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Unit Specifications Grid */}
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wide mb-3">
              Architectural Specifications
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configuration</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  {unit.bhk}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>RERA Carpet Area</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 font-mono mt-1">
                  {unit.carpetAreaSqFt.toLocaleString('en-IN')} sq.ft
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  <span>Primary Orientation & View</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  {unit.facing}
                </div>
              </div>
            </div>
          </div>

          {/* All-Inclusive Mandate Cost Sheet */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 tracking-wide">
                Mandate Cost Sheet Breakdown
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Rev v{unit.version}.0
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Base Price ({unit.carpetAreaSqFt} sq.ft)</span>
                <span className="font-mono text-slate-900">
                  {formatInrCompact(unit.basePriceInr)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Floor Rise Premium (Floor {unit.floor})</span>
                <span className="font-mono text-slate-900">
                  {formatInrCompact(unit.floorRiseInr)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Preferential Location Charge (PLC)</span>
                <span className="font-mono text-slate-900">
                  {formatInrCompact(unit.plcInr)}
                </span>
              </div>

              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between font-semibold text-slate-900">
                <span>Agreement Value</span>
                <span className="font-mono text-base text-indigo-600">
                  {formatInrCompact(agreementValue)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Est. GST (5%) + Stamp Duty (6%)</span>
                <span className="font-mono">
                  {formatInrCompact(gstEstimate + stampDutyEstimate)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>All-Inclusive Buyer Outflow</span>
                <span className="font-mono">{formatInrCompact(totalOutflow)}</span>
              </div>
            </div>

            {/* Channel Partner Brokerage Callout */}
            <div className="mt-4 p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-indigo-950">
                  Channel Partner Commission ({project?.brokerSharePct}%)
                </div>
                <div className="text-xs text-indigo-700 mt-0.5">
                  Triggered automatically upon booking allotment
                </div>
              </div>
              <div className="text-sm font-bold font-mono text-indigo-700">
                {formatInrCompact(estimatedBrokerCommission)}
              </div>
            </div>
          </div>

          {/* Attribution / Hold / Booking Details */}
          <div className="p-6">
            {unit.status === 'Sold' && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Allotment Confirmed & Locked</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="text-slate-500">Allotted Buyer: </span>
                    <span className="font-semibold text-slate-900">
                      {bookedLead ? bookedLead.buyerName : 'Institutional / Direct HNI Allottee'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Channel Partner: </span>
                    <span className="font-semibold text-slate-900">
                      {bookedBroker
                        ? `${bookedBroker.name} (${bookedBroker.firmName})`
                        : 'soleX Direct Mandate Desk'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {unit.status === 'Hold' && (
              <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="text-xs font-semibold text-amber-900">
                  24-Hour Inventory Hold Active
                </div>
                <div className="text-xs text-amber-800">
                  {heldLead
                    ? `Held for buyer '${heldLead.buyerName}' pending booking cheque clearance.`
                    : 'Temporarily held by site sales desk for buyer KYC verification.'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
          {unit.status !== 'Sold' ? (
            <>
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
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <span>Convert Unit {unit.unitNumber} to Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                {unit.status === 'Available' ? (
                  <button
                    type="button"
                    onClick={() => updateUnitStatus(unit.id, 'Hold')}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Place Unit on 24h Hold
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateUnitStatus(unit.id, 'Available')}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Release Hold (Mark Available)
                  </button>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedUnitId(null)}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Close Inspector
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
