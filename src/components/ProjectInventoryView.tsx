import React, { useState, useRef, Suspense } from 'react';
import {
  useSolexStore,
  UnitStatus,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import {
  formatInr,
  formatArea,
  formatPct,
  StatusLegend,
  EmptyStateBlock,
  getProjectColor,
} from '../lib/formatters';
import { MoreHorizontal, Building2 } from 'lucide-react';

const LazyThreeTowerView = React.lazy(() => import('./ThreeTowerView'));

export const ProjectInventoryView: React.FC = () => {
  const {
    projects,
    units,
    selectedProjectId,
    setSelectedProjectId,
    selectedUnitId,
    setSelectedUnitId,
    openBookingModal,
  } = useSolexStore();

  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [statusFilter, setStatusFilter] = useState<'All' | UnitStatus>('All');
  const [bhkFilter, setBhkFilter] = useState<string>('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const project =
    projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectUnits = units.filter((u) => u.projectId === project.id);

  const availableCount = projectUnits.filter(
    (u) => u.status === 'Available'
  ).length;
  const holdCount = projectUnits.filter((u) => u.status === 'Hold').length;
  const soldCount = projectUnits.filter((u) => u.status === 'Sold').length;

  const filteredUnits = projectUnits.filter((u) => {
    if (statusFilter !== 'All' && u.status !== statusFilter) return false;
    if (bhkFilter !== 'All' && u.bhk !== bhkFilter) return false;
    return true;
  });

  const filteredUnitIds = new Set(filteredUnits.map((u) => u.id));

  // Highest floor at top
  const floorsDesc: number[] = [];
  for (let f = project.floors; f >= 1; f--) {
    floorsDesc.push(f);
  }

  // Keyboard arrow navigation across the stacking grid
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    floor: number,
    stackIndex: number,
    unitId: string
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedUnitId(unitId);
      return;
    }

    let nextFloor = floor;
    let nextStack = stackIndex;

    if (e.key === 'ArrowRight') {
      nextStack = Math.min(project.unitsPerFloor, stackIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      nextStack = Math.max(1, stackIndex - 1);
    } else if (e.key === 'ArrowUp') {
      nextFloor = Math.min(project.floors, floor + 1);
    } else if (e.key === 'ArrowDown') {
      nextFloor = Math.max(1, floor - 1);
    } else {
      return;
    }

    e.preventDefault();
    const key = `${nextFloor}-${nextStack}`;
    cellRefs.current[key]?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="t-22-title text-[var(--text-primary)]">Inventory</h1>
          <p className="t-13 text-[var(--text-secondary)] mt-0.5">
            Select a unit in the stacking plan or 3D view to inspect the cost sheet, place a 24h hold, or book.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openBookingModal({ projectId: project.id })}
            className="btn-primary"
          >
            Book unit
          </button>

          {/* Mobile (< 640px) Actions Menu */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="btn-secondary px-2"
              aria-label="Inventory actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] shadow-eclipse py-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setViewMode(viewMode === '2d' ? '3d' : '2d');
                  }}
                  className="w-full px-3 py-2 text-left t-13 text-[var(--text-primary)] hover:bg-[var(--subtle)]"
                >
                  Switch to {viewMode === '2d' ? '3D view' : '2D plan'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Tabs + Right-Aligned 2D/3D Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-[var(--border)]">
        <div
          className="flex items-center gap-5 overflow-x-auto no-scrollbar -mb-px"
          role="tablist"
        >
          {projects.map((p, idx) => {
            const active = p.id === project.id;
            const projColor = getProjectColor(p.id, idx);
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setSelectedProjectId(p.id)}
                className={`pb-2.5 t-13-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
                  active
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: projColor }}
                />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right-Aligned 2D / 3D Segmented Control */}
        <div className="pb-2 flex items-center justify-between sm:justify-end gap-2">
          <span className="sm:hidden t-12 text-[var(--text-tertiary)]">
            Display mode
          </span>
          <div className="inline-flex p-0.5 rounded-[6px] bg-[var(--subtle)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`px-2.5 h-7 rounded-[4px] t-12 transition-colors cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              2D plan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-2.5 h-7 rounded-[4px] t-12 transition-colors cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              3D view
            </button>
          </div>
        </div>
      </div>

      {/* Compact Key-Facts Strip (2-col grid on mobile, inline flex on tablet/desktop) */}
      <div className="px-3.5 sm:px-4 py-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5 t-12">
        <div className="truncate">
          <span className="text-[var(--text-tertiary)]">Developer: </span>
          <span className="text-[var(--text-primary)] font-medium">
            {project.developerName}
          </span>
        </div>
        <div className="truncate">
          <span className="text-[var(--text-tertiary)]">RERA ID: </span>
          <span className="font-mono tabular-nums text-[var(--text-primary)]">
            {project.reraNumber}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Possession: </span>
          <span className="font-mono tabular-nums text-[var(--text-primary)]">
            {project.possessionDate}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Mandate fee: </span>
          <span className="font-mono tabular-nums text-[var(--text-primary)]">
            {formatPct(project.mandateCommissionPct)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[var(--text-tertiary)]">Channel share: </span>
          <span className="font-mono tabular-nums text-[var(--text-primary)]">
            {formatPct(project.brokerSharePct)}
          </span>
        </div>
      </div>

      {/* Legend with Live Counts Above + Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <StatusLegend
          availableCount={availableCount}
          holdCount={holdCount}
          soldCount={soldCount}
          blockedCount={0}
        />

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <label htmlFor="inventory-status-filter" className="sr-only">
            Filter units by status
          </label>
          <select
            id="inventory-status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'All' | UnitStatus)
            }
            aria-label="Filter units by status"
            className="input-control t-12 w-full sm:w-auto"
          >
            <option value="All">All statuses ({projectUnits.length})</option>
            <option value="Available">Available ({availableCount})</option>
            <option value="Hold">On hold ({holdCount})</option>
            <option value="Sold">Sold ({soldCount})</option>
          </select>

          <label htmlFor="inventory-bhk-filter" className="sr-only">
            Filter units by configuration
          </label>
          <select
            id="inventory-bhk-filter"
            value={bhkFilter}
            onChange={(e) => setBhkFilter(e.target.value)}
            aria-label="Filter units by configuration"
            className="input-control t-12 w-full sm:w-auto"
          >
            <option value="All">All configurations</option>
            <option value="2 BHK Luxury">2 BHK Luxury</option>
            <option value="3 BHK Grand">3 BHK Grand</option>
            <option value="4 BHK Sky Villa">4 BHK Sky Villa</option>
          </select>

          {(statusFilter !== 'All' || bhkFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setBhkFilter('All');
              }}
              className="btn-ghost btn-sm col-span-2 sm:col-span-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Frame: Either Lazy-Loaded 3D View OR Dense 2D Stacking Plan */}
      {viewMode === '3d' ? (
        <Suspense
          fallback={
            <div className="w-full h-[380px] sm:h-[520px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 flex flex-col justify-between">
              <div className="h-4 w-48 skeleton-block" />
              <div className="flex-1 my-4 sm:my-6 skeleton-block" />
              <div className="h-9 w-full max-w-xs mx-auto skeleton-block" />
            </div>
          }
        >
          <LazyThreeTowerView
            project={project}
            units={projectUnits}
            visibleUnitIds={filteredUnitIds}
            selectedUnitId={selectedUnitId}
            onSelectUnit={(id) => setSelectedUnitId(id)}
          />
        </Suspense>
      ) : (
        <div className="border border-[var(--border)] rounded-[10px] bg-[var(--surface)] overflow-hidden">
          {filteredUnits.length === 0 ? (
            <EmptyStateBlock
              icon={Building2}
              title="No units match the selected filters"
              guidance={`Clear the status or configuration filter to inspect all ${projectUnits.length} units in ${project.name}.`}
              actionLabel="Reset filters"
              onAction={() => {
                setStatusFilter('All');
                setBhkFilter('All');
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-left"
                role="grid"
                aria-label={`${project.name} stacking plan`}
              >
                <thead>
                  <tr className="h-9 bg-[var(--subtle)] border-b border-[var(--border)] text-[12px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                    <th className="sticky left-0 z-10 bg-[var(--subtle)] px-2.5 sm:px-4 w-16 sm:w-28 border-r border-[var(--border)]">
                      Floor
                    </th>
                    <th className="px-3 sm:px-4">
                      <span className="hidden sm:inline">
                        Stacking plan ({project.wings.join(' · ')}) — Arrow keys navigate, Enter inspects
                      </span>
                      <span className="sm:hidden">
                        Stacking plan ({project.wings.join(' · ')}) · Tap unit
                      </span>
                    </th>
                    <th className="px-4 text-right hidden md:table-cell">
                      Configuration & area
                    </th>
                    <th className="px-4 text-right hidden lg:table-cell">
                      Typical price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {floorsDesc.map((floorNum) => {
                    const allFloorUnits = projectUnits
                      .filter((u) => u.floor === floorNum)
                      .sort((a, b) => a.stackIndex - b.stackIndex);

                    const visibleOnFloor = allFloorUnits.filter((u) =>
                      filteredUnitIds.has(u.id)
                    );
                    if (visibleOnFloor.length === 0) return null;

                    const sampleUnit = visibleOnFloor[0];
                    const samplePrice = getUnitAllInclusivePrice(sampleUnit);

                    return (
                      <tr
                        key={floorNum}
                        className="hover:bg-[var(--subtle)] transition-colors"
                      >
                        {/* Pinned Left Floor Column */}
                        <td className="sticky left-0 z-10 bg-[var(--surface)] px-2.5 sm:px-4 py-1.5 border-r border-[var(--border)] align-middle">
                          <div className="font-mono tabular-nums t-13-medium text-[var(--text-primary)]">
                            F{String(floorNum).padStart(2, '0')}
                          </div>
                          <div className="t-12 text-[var(--text-tertiary)] text-[11px] sm:text-[12px]">
                            {floorNum === project.floors ? 'Crown' : 'Typical'}
                          </div>
                        </td>

                        {/* 76×52px Unit Cells: unit number in mono, configuration in 11px, 14% status fill + 1px status border, ivory hover */}
                        <td className="px-3 sm:px-4 py-1.5 align-middle">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {allFloorUnits.map((unit) => {
                              const isVisible = filteredUnitIds.has(unit.id);
                              if (!isVisible) {
                                return (
                                  <div
                                    key={unit.id}
                                    className="w-[74px] sm:w-[76px] h-[52px] rounded-[6px] border border-dashed border-[var(--border)] opacity-35 shrink-0"
                                    aria-hidden="true"
                                  />
                                );
                              }

                              const isSelected = unit.id === selectedUnitId;
                              const fillVar =
                                unit.status === 'Available'
                                  ? 'var(--status-available-fill)'
                                  : unit.status === 'Hold'
                                  ? 'var(--status-hold-fill)'
                                  : 'var(--status-sold-fill)';
                              const borderVar =
                                unit.status === 'Available'
                                  ? 'var(--status-available-border)'
                                  : unit.status === 'Hold'
                                  ? 'var(--status-hold-border)'
                                  : 'var(--status-sold-border)';
                              const dotVar =
                                unit.status === 'Available'
                                  ? 'var(--status-available)'
                                  : unit.status === 'Hold'
                                  ? 'var(--status-hold)'
                                  : 'var(--status-sold)';

                              const cellKey = `${unit.floor}-${unit.stackIndex}`;
                              const shortConfig = unit.bhk.replace(' Luxury', '').replace(' Grand', '').replace(' Sky Villa', '');

                              return (
                                <button
                                  key={unit.id}
                                  ref={(el) => {
                                    cellRefs.current[cellKey] = el;
                                  }}
                                  type="button"
                                  onClick={() => setSelectedUnitId(unit.id)}
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(
                                      e,
                                      unit.floor,
                                      unit.stackIndex,
                                      unit.id
                                    )
                                  }
                                  aria-label={`Unit ${unit.unitNumber}, ${unit.status}, ${unit.bhk}, ${formatInr(
                                    getUnitAllInclusivePrice(unit)
                                  )}`}
                                  style={{
                                    backgroundColor: isSelected
                                      ? 'var(--ivory-band)'
                                      : fillVar,
                                    borderColor: isSelected
                                      ? '#272757'
                                      : borderVar,
                                    borderWidth: isSelected ? '2px' : '1px',
                                  }}
                                  className="stacking-cell w-[74px] sm:w-[76px] h-[52px] shrink-0 rounded-[6px] px-2 py-1 flex flex-col justify-between text-left cursor-pointer"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-mono tabular-nums t-13-medium text-[var(--text-primary)]">
                                      {unit.unitNumber}
                                    </span>
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: dotVar }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between w-full text-[11px] leading-[14px] text-[var(--text-secondary)]">
                                    <span className="truncate">{shortConfig}</span>
                                    <span className="font-mono tabular-nums text-[10px]">
                                      {unit.status === 'Available'
                                        ? formatInr(
                                            getUnitAllInclusivePrice(unit)
                                          )
                                            .replace('₹', '')
                                            .replace(' Cr', 'C')
                                        : unit.status === 'Hold'
                                        ? 'Hold'
                                        : 'Sold'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Floor Configuration Summary */}
                        <td className="px-4 py-1.5 text-right align-middle hidden md:table-cell">
                          <div className="t-12 text-[var(--text-secondary)]">
                            {sampleUnit.bhk}
                          </div>
                          <div className="font-mono tabular-nums t-12 text-[var(--text-tertiary)]">
                            {formatArea(sampleUnit.carpetAreaSqFt)}
                          </div>
                        </td>

                        {/* Typical Floor Price */}
                        <td className="px-4 py-1.5 text-right align-middle hidden lg:table-cell font-mono tabular-nums t-13 text-[var(--text-primary)]">
                          {formatInr(samplePrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
