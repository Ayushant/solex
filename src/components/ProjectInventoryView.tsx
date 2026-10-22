import React, { useState } from 'react';
import {
  useSolexStore,
  UnitStatus,
  getUnitAllInclusivePrice,
  formatInrCompact,
} from '../store/useSolexStore';
import { ThreeTowerView } from './ThreeTowerView';
import {
  Building2,
  Grid,
  Box,
  CheckCircle2,
  Clock,
  Lock,
  SlidersHorizontal,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';

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

  const project =
    projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectUnits = units.filter((u) => u.projectId === project.id);

  const availableCount = projectUnits.filter((u) => u.status === 'Available').length;
  const holdCount = projectUnits.filter((u) => u.status === 'Hold').length;
  const soldCount = projectUnits.filter((u) => u.status === 'Sold').length;

  const filteredUnits = projectUnits.filter((u) => {
    if (statusFilter !== 'All' && u.status !== statusFilter) return false;
    if (bhkFilter !== 'All' && u.bhk !== bhkFilter) return false;
    return true;
  });

  const filteredUnitIds = new Set(filteredUnits.map((u) => u.id));

  // Group floors from top floor down to Floor 1 (standard architectural stacking chart)
  const floorsDesc: number[] = [];
  for (let f = project.floors; f >= 1; f--) {
    floorsDesc.push(f);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Bar: Project Selector & View Mode Toggle */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Project & Inventory Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            Interactive floor-by-floor stacking matrix and 3D architectural massing. Tap any apartment unit to inspect pricing or initiate a booking.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
          {/* Project Switcher Tabs (equal-width grid on mobile, inline tabs on sm+) */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer truncate ${
                  p.id === project.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* 2D Matrix vs 3D Tower View Toggle */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-900 text-white rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`justify-center flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === '2d'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5 shrink-0" />
              <span>2D Stacking Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`justify-center flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === '3d'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5 shrink-0" />
              <span>3D Tower</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mandate Summary Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="font-semibold text-indigo-600">
                {project.mandateType}
              </span>
              <span>·</span>
              <span>Developer: {project.developerName}</span>
              <span className="hidden sm:inline">·</span>
              <span className="font-mono">RERA: {project.reraNumber}</span>
              <span>·</span>
              <span>Possession: {project.possessionDate}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>{project.name}</span>
              <span className="text-xs sm:text-sm font-normal text-slate-500">
                — {project.location}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {project.mandateTermsSummary}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openBookingModal({ projectId: project.id })}
              className="w-full lg:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Book Unit in {project.name}</span>
            </button>
          </div>
        </div>

        {/* Inventory Absorption Counters & Filter Dropdowns */}
        <div className="pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
          {/* 2x2 grid on narrow mobile, horizontal row on sm+ */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-y-2 gap-x-4 sm:gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Total Stock:</span>
              <span className="font-bold font-mono tabular-nums text-slate-900">
                {project.totalUnits}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block shrink-0" />
              <span className="text-slate-600">Available:</span>
              <span className="font-bold font-mono tabular-nums text-emerald-700">
                {availableCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block shrink-0" />
              <span className="text-slate-600">On Hold:</span>
              <span className="font-bold font-mono tabular-nums text-amber-700">
                {holdCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-500 inline-block shrink-0" />
              <span className="text-slate-600">Sold:</span>
              <span className="font-bold font-mono tabular-nums text-slate-700">
                {soldCount}
              </span>
            </div>
          </div>

          {/* Interactive Filter Dropdowns (Unit Status Dropdown + Configuration Dropdown) */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label
                htmlFor="inventory-status-filter"
                className="font-medium text-slate-600 whitespace-nowrap"
              >
                Unit View:
              </label>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <select
                id="inventory-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'All' | UnitStatus)
                }
                aria-label="Filter units by status"
                className="w-full sm:w-auto px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                <option value="All">All Units ({projectUnits.length})</option>
                <option value="Available">
                  Available ({availableCount})
                </option>
                <option value="Sold">Sold ({soldCount})</option>
                <option value="Hold">On Hold ({holdCount})</option>
              </select>

              <select
                id="inventory-bhk-filter"
                value={bhkFilter}
                onChange={(e) => setBhkFilter(e.target.value)}
                aria-label="Filter units by configuration"
                className="w-full sm:w-auto px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                <option value="All">All Configurations</option>
                <option value="2 BHK Luxury">2 BHK Luxury</option>
                <option value="3 BHK Grand">3 BHK Grand</option>
                <option value="4 BHK Sky Villa">4 BHK Sky Villa</option>
              </select>
            </div>

            {(statusFilter !== 'All' || bhkFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setBhkFilter('All');
                }}
                className="w-full sm:w-auto justify-center px-2.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Either 3D Architectural Tower OR 2D Floor-by-Floor Stacking Grid */}
      {viewMode === '3d' ? (
        <ThreeTowerView
          project={project}
          units={projectUnits}
          visibleUnitIds={filteredUnitIds}
          selectedUnitId={selectedUnitId}
          onSelectUnit={(id) => setSelectedUnitId(id)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">
              Floor-by-Floor Inventory Stacking Matrix ({project.wings.join(' & ')}) · Showing {filteredUnits.length} of {projectUnits.length} Units
            </span>
            <span className="text-[11px] sm:text-xs">
              Tap any unit cell to open the Cost Sheet & Status Inspector
            </span>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="p-8 sm:p-12 text-center space-y-3">
              <div className="text-sm font-semibold text-slate-800">
                No apartment units match your active filter ({statusFilter}
                {bhkFilter !== 'All' ? ` · ${bhkFilter}` : ''})
              </div>
              <p className="text-xs text-slate-500">
                Reset the filter dropdown to inspect all available and sold inventory across {project.name}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setBhkFilter('All');
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset Unit Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {floorsDesc.map((floorNum) => {
                const unitsOnFloor = filteredUnits
                  .filter((u) => u.floor === floorNum)
                  .sort((a, b) => a.stackIndex - b.stackIndex);

                if (unitsOnFloor.length === 0) return null;

                const floorAvailCount = unitsOnFloor.filter(
                  (u) => u.status === 'Available'
                ).length;

                return (
                  <div
                    key={floorNum}
                    className="p-3 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Floor Label Column: Horizontal strip on mobile/tablet, left column on desktop */}
                    <div className="lg:w-36 shrink-0 flex lg:block items-center justify-between pb-1.5 lg:pb-0 border-b lg:border-b-0 border-slate-100">
                      <div className="flex items-center gap-2 lg:block">
                        <div className="text-xs font-bold text-slate-900 font-mono uppercase">
                          Floor 0{floorNum}
                        </div>
                        <div className="text-[11px] text-slate-500 lg:mt-0.5">
                          {floorNum === project.floors
                            ? 'Penthouse Crown'
                            : 'Typical Plate'}
                        </div>
                      </div>
                      <span className="lg:hidden text-[11px] font-mono font-semibold text-emerald-700">
                        {floorAvailCount}/{unitsOnFloor.length} Avail
                      </span>
                    </div>

                    {/* 4 Apartment Stack Cells: 2x2 floor plate on mobile/tablet, 1x4 row on desktop */}
                    <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
                      {unitsOnFloor.map((unit) => {
                        const isSelected = unit.id === selectedUnitId;
                        const allInclusive = getUnitAllInclusivePrice(unit);

                        const cardStyle =
                          unit.status === 'Available'
                            ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-400'
                            : unit.status === 'Hold'
                            ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400'
                            : 'border-slate-200 bg-slate-100/80 hover:bg-slate-200/60 hover:border-slate-300';

                        return (
                          <button
                            key={unit.id}
                            type="button"
                            onClick={() => setSelectedUnitId(unit.id)}
                            className={`p-2.5 sm:p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between min-w-0 ${cardStyle} ${
                              isSelected
                                ? 'ring-2 ring-indigo-600 border-indigo-600'
                                : ''
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-mono text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                                  {unit.unitNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold shrink-0 ${
                                    unit.status === 'Available'
                                      ? 'text-emerald-700'
                                      : unit.status === 'Hold'
                                      ? 'text-amber-700'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {unit.status === 'Available' && (
                                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                  )}
                                  {unit.status === 'Hold' && (
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                  )}
                                  {unit.status === 'Sold' && (
                                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                  )}
                                  <span>{unit.status}</span>
                                </span>
                              </div>

                              <div className="text-[11px] sm:text-xs font-medium text-slate-700 mt-1 truncate">
                                {unit.bhk}
                              </div>
                            </div>

                            <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs">
                              <span className="text-slate-500 font-mono tabular-nums whitespace-nowrap">
                                {unit.carpetAreaSqFt} sq.ft
                              </span>
                              <span className="font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                {formatInrCompact(allInclusive)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
