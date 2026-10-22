import React, { useState } from 'react';
import {
  useSolexStore,
  LeadStage,
  formatInrCompact,
} from '../store/useSolexStore';
import {
  Kanban,
  List,
  Plus,
  ArrowRight,
  Phone,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';

const STAGES: LeadStage[] = ['New', 'Site Visit', 'Negotiation', 'Booked'];

export const LeadPipelineView: React.FC = () => {
  const {
    leads,
    projects,
    brokers,
    units,
    role,
    activeBrokerId,
    updateLeadStage,
    openBookingModal,
    registerNewLead,
  } = useSolexStore();

  const [displayMode, setDisplayMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  // New Lead Form State
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [projectId, setProjectId] = useState('proj-skyline');
  const [interestedBhk, setInterestedBhk] = useState<
    '2 BHK Luxury' | '3 BHK Grand' | '4 BHK Sky Villa'
  >('3 BHK Grand');
  const [budgetCr, setBudgetCr] = useState('4.00');
  const [assignedBrokerId, setAssignedBrokerId] = useState(activeBrokerId);
  const [notes, setNotes] = useState('');

  // Scope leads if Broker role is active, then filter in real time by name or contact number
  const roleAndProjectLeads = leads.filter((l) => {
    if (role === 'Broker' && l.assignedBrokerId !== activeBrokerId) return false;
    if (projectFilter !== 'All' && l.projectId !== projectFilter) return false;
    return true;
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const compactDigitsQuery = normalizedQuery.replace(/[\s-]/g, '');

  const scopedLeads = roleAndProjectLeads.filter((l) => {
    if (!normalizedQuery) return true;
    const matchesName = l.buyerName.toLowerCase().includes(normalizedQuery);
    const matchesRawPhone = l.phone.toLowerCase().includes(normalizedQuery);
    const matchesCompactPhone =
      compactDigitsQuery.length > 0 &&
      l.phone.toLowerCase().replace(/[\s-]/g, '').includes(compactDigitsQuery);
    return matchesName || matchesRawPhone || matchesCompactPhone;
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !phone.trim()) return;

    const budgetInr = Math.round((parseFloat(budgetCr) || 3.5) * 10000000);
    registerNewLead({
      buyerName: buyerName.trim(),
      phone: phone.trim(),
      email: email.trim() || 'buyer@client.in',
      projectId,
      interestedBhk,
      budgetInr,
      assignedBrokerId: role === 'Broker' ? activeBrokerId : assignedBrokerId,
      notes,
    });

    setBuyerName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setShowNewLeadModal(false);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {role === 'Broker'
              ? 'My Channel Partner Leads'
              : 'Lead-to-Booking Pipeline'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track buyer progression from inquiry and site visit to unit negotiation and confirmed allotment.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Kanban / List View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
            <button
              type="button"
              onClick={() => setDisplayMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                displayMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                displayMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Register New Lead Button */}
          <button
            type="button"
            onClick={() => setShowNewLeadModal(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Lead</span>
          </button>
        </div>
      </div>

      {/* Top Real-Time Lead Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <label htmlFor="lead-pipeline-search" className="sr-only">
            Filter leads by buyer name or contact number
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="lead-pipeline-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter leads by buyer name or contact number (e.g., Vikramaditya or +91 98201)..."
            aria-label="Filter leads by buyer name or contact number"
            className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-300 bg-slate-50/60 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-3 shrink-0">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Filter leads by project"
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
          >
            <option value="All">All Mandate Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
            Showing <span className="font-bold text-slate-900">{scopedLeads.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{roleAndProjectLeads.length}</span> leads
          </div>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {displayMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STAGES.map((stage) => {
            const stageLeads = scopedLeads.filter((l) => l.stage === stage);
            const totalStageBudget = stageLeads.reduce(
              (acc, l) => acc + l.budgetInr,
              0
            );

            return (
              <div
                key={stage}
                className="bg-slate-100/90 rounded-xl border border-slate-200 p-3.5 flex flex-col gap-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {stage}
                    </h2>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      ({stageLeads.length})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatInrCompact(totalStageBudget)}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {stageLeads.length === 0 ? (
                    <div className="p-6 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400">
                      No leads in {stage}
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const proj = projects.find((p) => p.id === lead.projectId);
                      const broker = brokers.find(
                        (b) => b.id === lead.assignedBrokerId
                      );
                      const bookedUnit = lead.bookedUnitId
                        ? units.find((u) => u.id === lead.bookedUnitId)
                        : undefined;

                      return (
                        <div
                          key={lead.id}
                          className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-all space-y-3"
                        >
                          <div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span className="font-medium text-indigo-600">
                                {proj?.name}
                              </span>
                              <span>·</span>
                              <span>{lead.interestedBhk}</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mt-1">
                              {lead.buyerName}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{lead.phone}</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {lead.notes}
                          </p>

                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-slate-400">Budget: </span>
                              <span className="font-mono font-bold text-slate-900">
                                {formatInrCompact(lead.budgetInr)}
                              </span>
                            </div>
                            <span className="text-slate-500 truncate max-w-[130px]">
                              CP: {broker?.name}
                            </span>
                          </div>

                          {/* Stage Actions & Convert to Booking */}
                          {lead.stage !== 'Booked' ? (
                            <div className="pt-2 flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openBookingModal({
                                    leadId: lead.id,
                                    projectId: lead.projectId,
                                    unitId: lead.preferredUnitId,
                                  })
                                }
                                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <span>Convert to Booking</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick Stage Progression */}
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="text-slate-400">Move stage:</span>
                                <div className="flex items-center gap-1">
                                  {(['New', 'Site Visit', 'Negotiation'] as LeadStage[])
                                    .filter((s) => s !== lead.stage)
                                    .map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => updateLeadStage(lead.id, s)}
                                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                                      >
                                        {s}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2 flex items-center justify-between text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Booking Confirmed</span>
                              </span>
                              {bookedUnit && (
                                <span className="font-mono">
                                  Unit {bookedUnit.unitNumber}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Buyer Name & Contact</th>
                  <th className="py-3 px-4">Mandate Project</th>
                  <th className="py-3 px-4">Configuration</th>
                  <th className="py-3 px-4 text-right">Target Budget</th>
                  <th className="py-3 px-4">Channel Partner</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {scopedLeads.map((lead) => {
                  const proj = projects.find((p) => p.id === lead.projectId);
                  const brk = brokers.find((b) => b.id === lead.assignedBrokerId);
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {lead.buyerName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {lead.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                        {proj?.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {lead.interestedBhk}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatInrCompact(lead.budgetInr)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {brk?.name} · {brk?.firmName}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                        {lead.stage}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {lead.stage !== 'Booked' ? (
                          <button
                            type="button"
                            onClick={() =>
                              openBookingModal({
                                leadId: lead.id,
                                projectId: lead.projectId,
                                unitId: lead.preferredUnitId,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Convert to Booking
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700 font-mono">
                            Allotted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register New Lead Modal */}
      {showNewLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setShowNewLeadModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-base font-bold">Register New Buyer Lead</h2>
              <button
                type="button"
                onClick={() => setShowNewLeadModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buyer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="e.g., Aditya & Kavita Rao"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 00000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Budget (₹ Cr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={budgetCr}
                    onChange={(e) => setBudgetCr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Project
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Configuration
                  </label>
                  <select
                    value={interestedBhk}
                    onChange={(e) =>
                      setInterestedBhk(
                        e.target.value as
                          | '2 BHK Luxury'
                          | '3 BHK Grand'
                          | '4 BHK Sky Villa'
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    <option value="2 BHK Luxury">2 BHK Luxury</option>
                    <option value="3 BHK Grand">3 BHK Grand</option>
                    <option value="4 BHK Sky Villa">4 BHK Sky Villa</option>
                  </select>
                </div>
              </div>

              {role === 'Admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attributing Channel Partner (Broker)
                  </label>
                  <select
                    value={assignedBrokerId}
                    onChange={(e) => setAssignedBrokerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.firmName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site Visit / Requirement Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferred floor band, payment scheme..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewLeadModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Register Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
