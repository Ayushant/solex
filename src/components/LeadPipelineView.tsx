import React, { useState } from 'react';
import {
  useSolexStore,
  LeadStage,
  Lead,
} from '../store/useSolexStore';
import {
  formatInr,
  formatInrFull,
  formatRelativeAge,
  formatShortDate,
  maskPhone,
  ProjectChip,
  EmptyStateBlock,
} from '../lib/formatters';
import {
  Plus,
  Search,
  X,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  Users,
} from 'lucide-react';

const STAGES: LeadStage[] = ['New', 'Site Visit', 'Negotiation', 'Booked'];

const STAGE_COLORS: Record<LeadStage, string> = {
  New: '#6D8196',         // Slate
  'Site Visit': '#9A6410', // Hold / Bronze
  Negotiation: '#3A3A6B',  // Eclipse 700
  Booked: '#2E7D5B',       // Estate Green
};

type SortField = 'buyerName' | 'project' | 'budgetInr' | 'stage' | 'createdAt';

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
  const [mobileStage, setMobileStage] = useState<LeadStage>('New');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [openMenuLeadId, setOpenMenuLeadId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const [sortField, setSortField] = useState<SortField>('budgetInr');
  const [sortAsc, setSortAsc] = useState(false);

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

  const canViewPhone = (lead: Lead) =>
    role === 'Admin' ||
    (role === 'Broker' && lead.assignedBrokerId === activeBrokerId);

  const escapeCsvCell = (value: string | number) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportLeadsCsv = () => {
    const header = [
      'Lead ID',
      'Buyer Name',
      'Contact Number',
      'Email',
      'Mandate Project',
      'Interested Configuration',
      'Target Budget (INR)',
      'Pipeline Stage',
      'Channel Partner Name',
      'Brokerage Firm',
      'Allotted Unit',
      'Notes',
      'Registered Date',
    ];

    const dataRows = scopedLeads.map((lead) => {
      const proj = projects.find((p) => p.id === lead.projectId);
      const brk = brokers.find((b) => b.id === lead.assignedBrokerId);
      const bookedUnit = lead.bookedUnitId
        ? units.find((u) => u.id === lead.bookedUnitId)
        : undefined;

      return [
        lead.id,
        lead.buyerName,
        canViewPhone(lead) ? lead.phone : maskPhone(lead.phone, false),
        lead.email,
        proj?.name || '',
        lead.interestedBhk,
        lead.budgetInr,
        lead.stage,
        brk?.name || '',
        brk?.firmName || '',
        bookedUnit ? `Unit ${bookedUnit.unitNumber}` : '-',
        lead.notes,
        lead.createdAt,
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
        ? `solex-my-leads-${activeBrokerId}.csv`
        : 'solex-lead-pipeline.csv';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedLeads = [...scopedLeads].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortField === 'buyerName') {
      return a.buyerName.localeCompare(b.buyerName) * dir;
    }
    if (sortField === 'project') {
      const pa = projects.find((p) => p.id === a.projectId)?.name || '';
      const pb = projects.find((p) => p.id === b.projectId)?.name || '';
      return pa.localeCompare(pb) * dir;
    }
    if (sortField === 'budgetInr') {
      return (a.budgetInr - b.budgetInr) * dir;
    }
    if (sortField === 'stage') {
      return (STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)) * dir;
    }
    return a.createdAt.localeCompare(b.createdAt) * dir;
  });

  const selectedLead = selectedLeadId
    ? leads.find((l) => l.id === selectedLeadId)
    : null;

  const renderLeadCard = (lead: Lead) => {
    const proj = projects.find((p) => p.id === lead.projectId);
    const broker = brokers.find((b) => b.id === lead.assignedBrokerId);
    const isMenuOpen = openMenuLeadId === lead.id;

    return (
      <div
        key={lead.id}
        draggable={lead.stage !== 'Booked'}
        onDragStart={(e) => {
          setDraggedLeadId(lead.id);
          e.dataTransfer.setData('text/plain', lead.id);
        }}
        onDragEnd={() => {
          setDraggedLeadId(null);
          setDragOverStage(null);
        }}
        onClick={() => setSelectedLeadId(lead.id)}
        className={`group relative p-3.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors cursor-pointer ${
          draggedLeadId === lead.id ? 'opacity-50' : ''
        }`}
      >
        {/* Top Row: Buyer Name 14/500 + Hover ⋯ Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="t-14-medium text-[var(--text-primary)] truncate">
            {lead.buyerName}
          </div>

          <div
            className="relative shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenMenuLeadId(isMenuOpen ? null : lead.id)}
              aria-label={`Actions for ${lead.buyerName}`}
              className={`w-6 h-6 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--subtle)] transition-opacity cursor-pointer ${
                isMenuOpen
                  ? 'opacity-100 bg-[var(--subtle)]'
                  : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-7 z-30 w-44 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-eclipse py-1 t-12">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuLeadId(null);
                    setSelectedLeadId(lead.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[var(--subtle)] text-[var(--text-primary)] cursor-pointer"
                >
                  Inspect lead
                </button>
                {lead.stage !== 'Booked' &&
                  (['New', 'Site Visit', 'Negotiation'] as LeadStage[])
                    .filter((s) => s !== lead.stage)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          updateLeadStage(lead.id, s);
                          setOpenMenuLeadId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[var(--subtle)] text-[var(--text-secondary)] cursor-pointer"
                      >
                        Move to {s}
                      </button>
                    ))}
              </div>
            )}
          </div>
        </div>

        {/* Project Chip + Configuration */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {proj && <ProjectChip projectId={proj.id} name={proj.name} />}
          <span className="t-12 text-[var(--text-secondary)]">
            {lead.interestedBhk}
          </span>
        </div>

        {/* Budget in mono + Masked Phone */}
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <span
            className="t-13-medium t-mono text-[var(--text-primary)]"
            title={formatInrFull(lead.budgetInr)}
          >
            {formatInr(lead.budgetInr)}
          </span>
          <span className="t-12 t-mono text-[var(--text-tertiary)]">
            {maskPhone(lead.phone, canViewPhone(lead))}
          </span>
        </div>

        {/* CP name tertiary + "2d ago" */}
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[var(--border)] t-12 text-[var(--text-tertiary)]">
          <span className="truncate">{broker?.firmName || broker?.name}</span>
          <span className="t-mono shrink-0">
            {formatRelativeAge(lead.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="space-y-5"
      onClick={() => {
        if (openMenuLeadId) setOpenMenuLeadId(null);
      }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="t-22-title text-[var(--text-primary)]">Leads</h1>
          <p className="t-13 text-[var(--text-secondary)] mt-0.5">
            Buyer pipeline from initial inquiry and site visit to unit allotment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportLeadsCsv}
            className="btn-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>

          <div
            role="tablist"
            aria-label="Pipeline display mode"
            className="inline-flex items-center p-0.5 rounded-[6px] bg-[var(--subtle)] border border-[var(--border)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={displayMode === 'kanban'}
              onClick={() => setDisplayMode('kanban')}
              className={`h-[26px] px-2.5 rounded-[4px] t-12 transition-colors cursor-pointer ${
                displayMode === 'kanban'
                  ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Kanban
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={displayMode === 'list'}
              onClick={() => setDisplayMode('list')}
              className={`h-[26px] px-2.5 rounded-[4px] t-12 transition-colors cursor-pointer ${
                displayMode === 'list'
                  ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Table
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNewLeadModal(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New lead</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <label htmlFor="lead-pipeline-search" className="sr-only">
            Filter leads by buyer name or contact number
          </label>
          <Search className="w-3.5 h-3.5 text-[var(--icon-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="lead-pipeline-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by buyer name or phone..."
            aria-label="Filter leads by buyer name or contact number"
            className="input-control pl-8 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Filter leads by project"
            className="input-control w-auto"
          >
            <option value="All">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <span className="t-12 t-mono text-[var(--text-tertiary)] whitespace-nowrap">
            {scopedLeads.length} of {roleAndProjectLeads.length}
          </span>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {displayMode === 'kanban' ? (
        <>
          {/* Mobile (<640px): Stage selector + list */}
          <div className="sm:hidden space-y-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border)]">
              {STAGES.map((stage) => {
                const count = scopedLeads.filter(
                  (l) => l.stage === stage
                ).length;
                const active = mobileStage === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setMobileStage(stage)}
                    className={`px-2.5 py-1.5 rounded-[6px] t-12 whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] font-medium'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {stage} <span className="t-mono">({count})</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2.5">
              {scopedLeads
                .filter((l) => l.stage === mobileStage)
                .map((lead) => renderLeadCard(lead))}
            </div>
          </div>

          {/* Desktop/Tablet (>=640px): 4 columns on Paper 50, headers in stage colour with mono count and stage value */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {STAGES.map((stage) => {
              const stageLeads = scopedLeads.filter((l) => l.stage === stage);
              const totalStageBudget = stageLeads.reduce(
                (acc, l) => acc + l.budgetInr,
                0
              );
              const isDropTarget = dragOverStage === stage;
              const stageColor = STAGE_COLORS[stage];

              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    if (stage === 'Booked') return;
                    e.preventDefault();
                    setDragOverStage(stage);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    const droppedId =
                      e.dataTransfer.getData('text/plain') || draggedLeadId;
                    if (droppedId && stage !== 'Booked') {
                      updateLeadStage(droppedId, stage);
                    }
                    setDraggedLeadId(null);
                  }}
                  className={`space-y-2.5 rounded-[10px] transition-colors ${
                    isDropTarget ? 'bg-[var(--subtle)] p-2 -m-2' : ''
                  }`}
                >
                  {/* Column Header in Stage Colour */}
                  <div
                    className="flex items-center justify-between pb-2 border-b-2"
                    style={{ borderColor: stageColor }}
                  >
                    <div className="flex items-center gap-2 t-12">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stageColor }}
                      />
                      <span
                        className="font-semibold"
                        style={{ color: stageColor }}
                      >
                        {stage}
                      </span>
                      <span className="t-mono text-[var(--text-tertiary)]">
                        {stageLeads.length}
                      </span>
                    </div>
                    <span
                      className="t-12 t-mono text-[var(--text-secondary)]"
                      title={formatInrFull(totalStageBudget)}
                    >
                      {formatInr(totalStageBudget)}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-2.5 min-h-[120px]">
                    {stageLeads.length === 0 ? (
                      <div className="py-4 t-12 text-[var(--text-tertiary)]">
                        No leads in {stage.toLowerCase()}.
                      </div>
                    ) : (
                      stageLeads.map((lead) => renderLeadCard(lead))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* TABLE VIEW: Paper 25 header, 12px uppercase Paper 500 labels, 44px rows, hover Paper 25, right-aligned mono numbers, "⋯" row actions */
        <div className="border border-[var(--border)] rounded-[10px] bg-[var(--surface)] overflow-hidden">
          {sortedLeads.length === 0 ? (
            <EmptyStateBlock
              icon={Users}
              title="No buyer leads match your filter"
              guidance="Clear the search query or register a new buyer inquiry."
              actionLabel="Reset filter"
              onAction={() => {
                setSearchQuery('');
                setProjectFilter('All');
              }}
            />
          ) : (
            <>
              {/* Mobile stacked rows (<640px) */}
              <div className="sm:hidden divide-y divide-[var(--border)]">
                {sortedLeads.map((lead) => {
                  const proj = projects.find((p) => p.id === lead.projectId);
                  const brk = brokers.find(
                    (b) => b.id === lead.assignedBrokerId
                  );
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="p-3.5 space-y-1 cursor-pointer hover:bg-[var(--subtle)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="t-14-medium text-[var(--text-primary)]">
                          {lead.buyerName}
                        </span>
                        <span className="t-13 t-mono text-[var(--text-primary)]">
                          {formatInr(lead.budgetInr)}
                        </span>
                      </div>
                      <div className="t-12 text-[var(--text-secondary)]">
                        {proj?.name} · {lead.interestedBhk} · {lead.stage}
                      </div>
                      <div className="flex items-center justify-between t-12 text-[var(--text-tertiary)]">
                        <span className="t-mono">
                          {maskPhone(lead.phone, canViewPhone(lead))}
                        </span>
                        <span>{brk?.firmName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop/Tablet Table (>=640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[var(--subtle)] border-b border-[var(--border)]">
                    <tr className="h-9 text-[12px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                      <th className="px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('buyerName')}
                          className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer uppercase"
                        >
                          <span>Buyer</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('project')}
                          className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer uppercase"
                        >
                          <span>Project · Config</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4">Phone</th>
                      <th className="px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('budgetInr')}
                          className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer uppercase ml-auto"
                        >
                          <span>Budget</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4">Channel partner</th>
                      <th className="px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('stage')}
                          className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer uppercase"
                        >
                          <span>Stage</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 text-right">Last activity</th>
                      <th className="px-4 text-right w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] t-13">
                    {sortedLeads.map((lead) => {
                      const proj = projects.find(
                        (p) => p.id === lead.projectId
                      );
                      const brk = brokers.find(
                        (b) => b.id === lead.assignedBrokerId
                      );
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="group h-11 hover:bg-[var(--subtle)] transition-colors cursor-pointer"
                        >
                          <td className="px-4 font-medium text-[var(--text-primary)]">
                            {lead.buyerName}
                          </td>
                          <td className="px-4">
                            <div className="flex items-center gap-2">
                              {proj && (
                                <ProjectChip
                                  projectId={proj.id}
                                  name={proj.name}
                                />
                              )}
                              <span className="text-[var(--text-secondary)]">
                                {lead.interestedBhk}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 t-mono text-[var(--text-secondary)]">
                            {maskPhone(lead.phone, canViewPhone(lead))}
                          </td>
                          <td
                            className="px-4 text-right t-mono text-[var(--text-primary)]"
                            title={formatInrFull(lead.budgetInr)}
                          >
                            {formatInr(lead.budgetInr)}
                          </td>
                          <td className="px-4 text-[var(--text-tertiary)]">
                            {brk?.firmName}
                          </td>
                          <td className="px-4">
                            <span
                              className="inline-flex items-center gap-1.5 t-12 font-medium"
                              style={{ color: STAGE_COLORS[lead.stage] }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  backgroundColor: STAGE_COLORS[lead.stage],
                                }}
                              />
                              <span>{lead.stage}</span>
                            </span>
                          </td>
                          <td className="px-4 text-right t-mono text-[var(--text-tertiary)]">
                            {formatRelativeAge(lead.createdAt)}
                          </td>
                          <td
                            className="px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedLeadId(lead.id)}
                              aria-label={`Inspect ${lead.buyerName}`}
                              className="w-7 h-7 rounded-[6px] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] cursor-pointer"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-2.5 bg-[var(--subtle)] border-t border-[var(--border)] flex items-center justify-between t-12 text-[var(--text-tertiary)]">
                <span className="t-mono">
                  1–{sortedLeads.length} of {roleAndProjectLeads.length}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* LEAD DETAIL DRAWER (480px Right; "Convert to booking" is the accent button here) */}
      {selectedLead && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setSelectedLeadId(null)}
          />
          <aside
            role="dialog"
            aria-label={`Lead ${selectedLead.buyerName}`}
            className="drawer-enter relative z-50 w-full max-w-[480px] bg-[var(--surface)] h-full border-l border-[var(--border)] shadow-eclipse flex flex-col justify-between overflow-y-auto"
          >
            <div className="divide-y divide-[var(--border)]">
              <div
                className="p-5 flex items-start justify-between gap-4 border-b"
                style={{
                  backgroundColor: 'var(--ivory-band)',
                  borderColor: 'var(--ivory-band-border)',
                }}
              >
                <div>
                  <div className="t-12 text-[var(--text-secondary)]">
                    {
                      projects.find((p) => p.id === selectedLead.projectId)
                        ?.name
                    }{' '}
                    · {selectedLead.interestedBhk}
                  </div>
                  <h2 className="t-22-title text-[var(--text-primary)] mt-1">
                    {selectedLead.buyerName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(null)}
                  className="btn-ghost btn-sm px-2"
                  aria-label="Close lead drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-2 gap-4 t-13">
                <div>
                  <div className="t-12 text-[var(--text-tertiary)]">Phone</div>
                  <div className="t-mono text-[var(--text-primary)] mt-0.5">
                    {maskPhone(selectedLead.phone, canViewPhone(selectedLead))}
                  </div>
                </div>
                <div>
                  <div className="t-12 text-[var(--text-tertiary)]">Budget</div>
                  <div
                    className="t-mono text-[var(--money-total)] font-medium mt-0.5"
                    title={formatInrFull(selectedLead.budgetInr)}
                  >
                    {formatInr(selectedLead.budgetInr)}
                  </div>
                </div>
                <div>
                  <div className="t-12 text-[var(--text-tertiary)]">
                    Channel partner
                  </div>
                  <div className="text-[var(--text-primary)] mt-0.5">
                    {
                      brokers.find(
                        (b) => b.id === selectedLead.assignedBrokerId
                      )?.name
                    }{' '}
                    ·{' '}
                    {
                      brokers.find(
                        (b) => b.id === selectedLead.assignedBrokerId
                      )?.firmName
                    }
                  </div>
                </div>
                <div>
                  <div className="t-12 text-[var(--text-tertiary)]">
                    Registered
                  </div>
                  <div className="t-mono text-[var(--text-primary)] mt-0.5">
                    {formatShortDate(selectedLead.createdAt)}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <div className="t-12 text-[var(--text-tertiary)]">Stage</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STAGES.map((stg) => {
                    const active = selectedLead.stage === stg;
                    const disabled = stg === 'Booked' && !active;
                    return (
                      <button
                        key={stg}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (stg !== 'Booked') {
                            updateLeadStage(selectedLead.id, stg);
                          }
                        }}
                        className={`h-7 px-2.5 rounded-[6px] t-12 border transition-colors ${
                          active
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--subtle)] font-medium'
                            : disabled
                            ? 'border-[var(--border)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer'
                        }`}
                      >
                        {stg}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 space-y-1.5">
                <div className="t-12 text-[var(--text-tertiary)]">Notes</div>
                <p className="t-13 text-[var(--text-secondary)]">
                  {selectedLead.notes || 'No requirement notes recorded.'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="btn-secondary"
              >
                Close
              </button>
              {selectedLead.stage !== 'Booked' && (
                <button
                  type="button"
                  onClick={() => {
                    const targetLead = selectedLead;
                    setSelectedLeadId(null);
                    openBookingModal({
                      leadId: targetLead.id,
                      projectId: targetLead.projectId,
                      unitId: targetLead.preferredUnitId,
                    });
                  }}
                  className="btn-accent"
                >
                  Convert to booking
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Register New Lead Dialog (480px) */}
      {showNewLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setShowNewLeadModal(false)}
          />
          <div
            role="dialog"
            aria-label="New buyer lead"
            className="relative z-10 w-full max-w-[480px] rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-eclipse overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="t-16 text-[var(--text-primary)]">
                New buyer lead
              </h2>
              <button
                type="button"
                onClick={() => setShowNewLeadModal(false)}
                className="btn-ghost btn-sm px-2"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-3.5">
              <div>
                <label className="block t-12 text-[var(--text-secondary)] mb-1">
                  Buyer name
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Aditya & Kavita Rao"
                  className="input-control"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block t-12 text-[var(--text-secondary)] mb-1">
                    Mobile number
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 00000"
                    className="input-control t-mono"
                  />
                </div>
                <div>
                  <label className="block t-12 text-[var(--text-secondary)] mb-1">
                    Budget (₹ Cr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={budgetCr}
                    onChange={(e) => setBudgetCr(e.target.value)}
                    className="input-control t-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block t-12 text-[var(--text-secondary)] mb-1">
                    Project
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="input-control"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block t-12 text-[var(--text-secondary)] mb-1">
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
                    className="input-control"
                  >
                    <option value="2 BHK Luxury">2 BHK Luxury</option>
                    <option value="3 BHK Grand">3 BHK Grand</option>
                    <option value="4 BHK Sky Villa">4 BHK Sky Villa</option>
                  </select>
                </div>
              </div>

              {role === 'Admin' && (
                <div>
                  <label className="block t-12 text-[var(--text-secondary)] mb-1">
                    Channel partner
                  </label>
                  <select
                    value={assignedBrokerId}
                    onChange={(e) => setAssignedBrokerId(e.target.value)}
                    className="input-control"
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
                <label className="block t-12 text-[var(--text-secondary)] mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Floor preference, payment plan..."
                  className="input-control"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewLeadModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
