import React, { useState } from 'react';
import {
  useSolexStore,
  LeadStage,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import {
  formatInr,
  formatInrFull,
  formatRelativeAge,
  maskPhone,
  UnitStatusBadge,
} from '../lib/formatters';
import {
  LayoutGrid,
  Layers,
  Maximize2,
  Minimize2,
  X,
  Search,
  Play,
  RotateCcw,
  ArrowUpRight,
  Plus,
  Download,
  SlidersHorizontal,
  Check,
  GitBranch,
  TrendingUp,
  Users,
  Package,
} from 'lucide-react';

type WindowId = 'finance-chart' | 'crm-profiles' | 'workflow-graph' | 'erp-supply';

interface WindowState {
  id: WindowId;
  title: string;
  moduleTag: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FinancialPoint {
  month: string;
  revenueCr: number;
  pipelineCr: number;
  supplyCapexCr: number;
  dealsClosed: number;
  operatingMarginPct: number;
  yoyGrowthPct: number;
}

const FINANCIAL_SERIES: FinancialPoint[] = [
  { month: 'Jan', revenueCr: 14.2, pipelineCr: 28.5, supplyCapexCr: 6.4, dealsClosed: 4, operatingMarginPct: 24.2, yoyGrowthPct: 14.1 },
  { month: 'Feb', revenueCr: 16.8, pipelineCr: 31.0, supplyCapexCr: 7.1, dealsClosed: 5, operatingMarginPct: 25.8, yoyGrowthPct: 16.4 },
  { month: 'Mar', revenueCr: 21.4, pipelineCr: 36.2, supplyCapexCr: 8.2, dealsClosed: 6, operatingMarginPct: 28.1, yoyGrowthPct: 19.8 },
  { month: 'Apr', revenueCr: 19.5, pipelineCr: 34.8, supplyCapexCr: 7.9, dealsClosed: 5, operatingMarginPct: 26.5, yoyGrowthPct: 17.2 },
  { month: 'May', revenueCr: 24.1, pipelineCr: 41.5, supplyCapexCr: 9.0, dealsClosed: 7, operatingMarginPct: 29.4, yoyGrowthPct: 22.0 },
  { month: 'Jun', revenueCr: 27.6, pipelineCr: 45.0, supplyCapexCr: 9.8, dealsClosed: 8, operatingMarginPct: 31.0, yoyGrowthPct: 24.5 },
  { month: 'Jul', revenueCr: 25.9, pipelineCr: 43.2, supplyCapexCr: 9.4, dealsClosed: 7, operatingMarginPct: 30.2, yoyGrowthPct: 21.8 },
  { month: 'Aug', revenueCr: 31.2, pipelineCr: 49.8, supplyCapexCr: 10.6, dealsClosed: 9, operatingMarginPct: 32.7, yoyGrowthPct: 26.9 },
  { month: 'Sep', revenueCr: 34.8, pipelineCr: 54.1, supplyCapexCr: 11.2, dealsClosed: 10, operatingMarginPct: 34.1, yoyGrowthPct: 29.3 },
  { month: 'Oct', revenueCr: 38.5, pipelineCr: 61.4, supplyCapexCr: 12.1, dealsClosed: 11, operatingMarginPct: 35.8, yoyGrowthPct: 33.4 },
  { month: 'Nov', revenueCr: 42.0, pipelineCr: 66.8, supplyCapexCr: 12.9, dealsClosed: 12, operatingMarginPct: 36.9, yoyGrowthPct: 35.1 },
  { month: 'Dec', revenueCr: 47.4, pipelineCr: 74.2, supplyCapexCr: 13.8, dealsClosed: 14, operatingMarginPct: 38.4, yoyGrowthPct: 39.6 },
];

interface WorkflowNode {
  id: string;
  title: string;
  category: string;
  metric: string;
  x: number;
  y: number;
  configLabel: string;
  configValue: string;
  enabled: boolean;
}

const INITIAL_WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: 'node-webhook',
    title: 'CRM Lead Capture',
    category: 'Trigger · Inbound',
    metric: '1,420 events/mo',
    x: 28,
    y: 44,
    configLabel: 'Attribution Window',
    configValue: '90 Days RERA Lock',
    enabled: true,
  },
  {
    id: 'node-kyc',
    title: 'KYC & Credit Scoring',
    category: 'CRM · Verification',
    metric: '99.2% pass rate',
    x: 240,
    y: 26,
    configLabel: 'Compliance Rule',
    configValue: 'PAN + Aadhaar API',
    enabled: true,
  },
  {
    id: 'node-lock',
    title: 'ERP Inventory Lock',
    category: 'ERP · Concurrency',
    metric: 'SELECT FOR UPDATE',
    x: 240,
    y: 142,
    configLabel: 'Hold TTL',
    configValue: '24h Auto-Expiry',
    enabled: true,
  },
  {
    id: 'node-escrow',
    title: 'RERA Escrow Split',
    category: 'ERP · Treasury',
    metric: '70% / 30% Sweep',
    x: 460,
    y: 44,
    configLabel: 'Escrow Account',
    configValue: 'HDFC RERA #0042',
    enabled: true,
  },
  {
    id: 'node-payout',
    title: 'Brokerage & 194H TDS',
    category: 'Finance · Ledger',
    metric: '5.0% TDS Deduct',
    x: 460,
    y: 142,
    configLabel: 'Disbursement Trigger',
    configValue: '10% Token Realized',
    enabled: true,
  },
];

const WORKFLOW_EDGES: { from: string; to: string }[] = [
  { from: 'node-webhook', to: 'node-kyc' },
  { from: 'node-webhook', to: 'node-lock' },
  { from: 'node-kyc', to: 'node-escrow' },
  { from: 'node-lock', to: 'node-escrow' },
  { from: 'node-lock', to: 'node-payout' },
];

interface SupplyChainOrder {
  id: string;
  material: string;
  vendor: string;
  project: string;
  amountInr: number;
  eta: string;
  fulfillmentPct: number;
  status: 'On Schedule' | 'In Transit' | 'Customs Hold';
}

const INITIAL_SUPPLY_ORDERS: SupplyChainOrder[] = [
  {
    id: 'PO-9041',
    material: 'Low-E Double Glazed Facade Panels',
    vendor: 'Saint-Gobain Architectural',
    project: 'The Sovereign Skyline',
    amountInr: 42500000,
    eta: '28 Oct',
    fulfillmentPct: 88,
    status: 'On Schedule',
  },
  {
    id: 'PO-9042',
    material: 'High-Speed Gearless Elevators (4m/s)',
    vendor: 'Mitsubishi Electric India',
    project: 'The Sovereign Skyline',
    amountInr: 68000000,
    eta: '04 Nov',
    fulfillmentPct: 65,
    status: 'In Transit',
  },
  {
    id: 'PO-9043',
    material: 'Italian Statuario Marble Slabs (Lot B)',
    vendor: 'Classic Marble Impex',
    project: 'Veridian Bay Residences',
    amountInr: 29500000,
    eta: '12 Nov',
    fulfillmentPct: 42,
    status: 'Customs Hold',
  },
  {
    id: 'PO-9044',
    material: 'FE-550D Seismic Reinforcement Steel',
    vendor: 'Tata Tiscon Enterprise',
    project: 'One Horizon Crest',
    amountInr: 54000000,
    eta: '25 Oct',
    fulfillmentPct: 96,
    status: 'On Schedule',
  },
];

export const OsWorkspaceView: React.FC = () => {
  const {
    leads,
    projects,
    brokers,
    units,
    bookings,
    role,
    activeBrokerId,
    updateLeadStage,
    openBookingModal,
    setSelectedUnitId,
    setSelectedProjectId,
    setActiveScreen,
  } = useSolexStore();

  // Window Management Mode: 'tiled' (clean organized 12-col grid) or 'floating' (overlapping draggable OS windows)
  const [layoutMode, setLayoutMode] = useState<'tiled' | 'floating'>('tiled');
  const [activeWindowId, setActiveWindowId] = useState<WindowId>('finance-chart');

  const [windows, setWindows] = useState<WindowState[]>([
    {
      id: 'finance-chart',
      title: 'Financial Telemetry & Revenue Velocity',
      moduleTag: 'ERP · Finance',
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 12,
      x: 16,
      y: 16,
      w: 660,
      h: 410,
    },
    {
      id: 'workflow-graph',
      title: 'Automated CRM-to-ERP Workflow Graph',
      moduleTag: 'OS · Automation',
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 11,
      x: 696,
      y: 16,
      w: 650,
      h: 410,
    },
    {
      id: 'crm-profiles',
      title: 'Customer Profiles & CRM Deal Table',
      moduleTag: 'CRM · Pipeline',
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
      x: 16,
      y: 442,
      w: 760,
      h: 430,
    },
    {
      id: 'erp-supply',
      title: 'Supply Chain & Unit Inventory Matrix',
      moduleTag: 'ERP · Operations',
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 9,
      x: 792,
      y: 442,
      w: 554,
      h: 430,
    },
  ]);

  // Dragging state for Floating OS Windows
  const [draggingWin, setDraggingWin] = useState<{
    id: WindowId;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Window 1: Financial Line Chart Interactive State
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(9); // Oct default
  const [horizon, setHorizon] = useState<'ALL' | 'H1' | 'H2'>('ALL');
  const [showRevenueLine, setShowRevenueLine] = useState(true);
  const [showPipelineLine, setShowPipelineLine] = useState(true);
  const [showCapexLine, setShowCapexLine] = useState(true);

  // Window 2: Customer Profiles & CRM Table State
  const [crmSearch, setCrmSearch] = useState('');
  const [crmStageFilter, setCrmStageFilter] = useState<'All' | LeadStage>('All');
  const [selectedProfileLeadId, setSelectedProfileLeadId] = useState<string>(
    leads[0]?.id || ''
  );

  // Window 3: Automated Workflow Node Graph State
  const [wfNodes, setWfNodes] = useState<WorkflowNode[]>(INITIAL_WORKFLOW_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-lock');
  const [activeSimulationStep, setActiveSimulationStep] = useState<number | null>(
    null
  );
  const [simulationRuns, setSimulationRuns] = useState<number>(128);

  // Window 4: ERP Supply Chain & Inventory Tab
  const [erpSubTab, setErpSubTab] = useState<'inventory' | 'supply'>('inventory');
  const [supplyOrders, setSupplyOrders] = useState<SupplyChainOrder[]>(
    INITIAL_SUPPLY_ORDERS
  );

  // Window helper functions
  const focusWindow = (id: WindowId) => {
    setActiveWindowId(id);
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
      return prev.map((w) =>
        w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w
      );
    });
  };

  const toggleMinimizeWindow = (id: WindowId) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isMinimized: !w.isMinimized, isMaximized: false } : w
      )
    );
  };

  const toggleMaximizeWindow = (id: WindowId) => {
    focusWindow(id);
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized, isMinimized: false } : w
      )
    );
  };

  const closeOrOpenWindow = (id: WindowId, openState?: boolean) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isOpen: openState !== undefined ? openState : !w.isOpen,
              isMinimized: false,
              isMaximized: false,
            }
          : w
      )
    );
    if (openState !== false) {
      focusWindow(id);
    }
  };

  const cascadeFloatingWindows = () => {
    setLayoutMode('floating');
    setWindows((prev) =>
      prev.map((w, idx) => ({
        ...w,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        x: 28 + idx * 56,
        y: 24 + idx * 48,
        w: 720,
        h: 420,
        zIndex: 10 + idx,
      }))
    );
    setActiveWindowId('erp-supply');
  };

  const resetSplitFloatingWindows = () => {
    setLayoutMode('floating');
    setWindows([
      {
        id: 'finance-chart',
        title: 'Financial Telemetry & Revenue Velocity',
        moduleTag: 'ERP · Finance',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 14,
        x: 16,
        y: 16,
        w: 660,
        h: 400,
      },
      {
        id: 'workflow-graph',
        title: 'Automated CRM-to-ERP Workflow Graph',
        moduleTag: 'OS · Automation',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 13,
        x: 692,
        y: 16,
        w: 650,
        h: 400,
      },
      {
        id: 'crm-profiles',
        title: 'Customer Profiles & CRM Deal Table',
        moduleTag: 'CRM · Pipeline',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 12,
        x: 16,
        y: 432,
        w: 760,
        h: 410,
      },
      {
        id: 'erp-supply',
        title: 'Supply Chain & Unit Inventory Matrix',
        moduleTag: 'ERP · Operations',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 11,
        x: 792,
        y: 432,
        w: 550,
        h: 410,
      },
    ]);
  };

  // Workflow Simulation Handler
  const runWorkflowSimulation = () => {
    if (activeSimulationStep !== null) return;
    setActiveSimulationStep(0);
    [1, 2, 3, 4].forEach((stepIdx) => {
      window.setTimeout(() => {
        setActiveSimulationStep(stepIdx);
      }, stepIdx * 450);
    });
    window.setTimeout(() => {
      setActiveSimulationStep(null);
      setSimulationRuns((c) => c + 1);
    }, 2300);
  };

  // Filtered Financial Points
  const visibleFinancialPoints =
    horizon === 'H1'
      ? FINANCIAL_SERIES.slice(0, 6)
      : horizon === 'H2'
      ? FINANCIAL_SERIES.slice(6, 12)
      : FINANCIAL_SERIES;

  const safeSelectedIdx = Math.min(
    selectedMonthIdx,
    visibleFinancialPoints.length - 1
  );
  const inspectedPoint =
    visibleFinancialPoints[safeSelectedIdx] || visibleFinancialPoints[0];

  // Filtered CRM Leads
  const scopedLeads = leads.filter((l) => {
    if (role === 'Broker' && l.assignedBrokerId !== activeBrokerId) return false;
    if (crmStageFilter !== 'All' && l.stage !== crmStageFilter) return false;
    if (crmSearch.trim()) {
      const q = crmSearch.toLowerCase();
      return (
        l.buyerName.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.interestedBhk.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inspectedCustomer =
    leads.find((l) => l.id === selectedProfileLeadId) ||
    scopedLeads[0] ||
    leads[0];

  const inspectedNode =
    wfNodes.find((n) => n.id === selectedNodeId) || wfNodes[0];

  // Top-level KPI Summary Values
  const totalCommittedRevenue = bookings.reduce(
    (s, b) => s + b.agreementValueInr,
    0
  );
  const totalPipelineBudget = leads
    .filter((l) => l.stage !== 'Booked')
    .reduce((s, l) => s + l.budgetInr, 0);
  const availableUnitsCount = units.filter(
    (u) => u.status === 'Available'
  ).length;

  // Render Window Chrome Wrapper
  const renderWindowFrame = (
    win: WindowState,
    children: React.ReactNode,
    gridSpanClass: string
  ) => {
    if (!win.isOpen || win.isMinimized) return null;
    const isFocused = activeWindowId === win.id;

    const floatingStyle: React.CSSProperties =
      layoutMode === 'floating' && !win.isMaximized
        ? {
            position: 'absolute',
            left: `${win.x}px`,
            top: `${win.y}px`,
            width: `${win.w}px`,
            height: `${win.h}px`,
            zIndex: win.zIndex,
          }
        : layoutMode === 'floating' && win.isMaximized
        ? {
            position: 'absolute',
            inset: '12px',
            zIndex: 50,
          }
        : {};

    return (
      <section
        key={win.id}
        aria-label={win.title}
        style={floatingStyle}
        onMouseDown={() => focusWindow(win.id)}
        className={`os-window flex flex-col overflow-hidden ${
          isFocused ? 'os-window-active' : ''
        } ${
          win.isMaximized && layoutMode === 'tiled'
            ? 'col-span-12 min-h-[620px]'
            : gridSpanClass
        }`}
      >
        {/* OS Window Title Bar */}
        <div
          onMouseDown={(e) => {
            if (layoutMode !== 'floating' || win.isMaximized) return;
            const target = e.target as HTMLElement;
            if (target.closest('button')) return;
            setDraggingWin({
              id: win.id,
              startX: e.clientX,
              startY: e.clientY,
              origX: win.x,
              origY: win.y,
            });
          }}
          className={`h-9 px-3.5 border-b border-[var(--border)] bg-[var(--surface)]/90 flex items-center justify-between gap-3 select-none shrink-0 ${
            layoutMode === 'floating' && !win.isMaximized ? 'cursor-move' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="t-12 font-semibold text-[var(--text-primary)] truncate">
              {win.title}
            </span>
            <span className="t-12 text-[var(--text-tertiary)] hidden sm:inline">
              · {win.moduleTag}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => toggleMinimizeWindow(win.id)}
              className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] cursor-pointer"
              aria-label={`Minimize ${win.title}`}
              title="Minimize to dock"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => toggleMaximizeWindow(win.id)}
              className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] cursor-pointer"
              aria-label={`Maximize ${win.title}`}
              title={win.isMaximized ? 'Restore size' : 'Expand window'}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => closeOrOpenWindow(win.id, false)}
              className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-blocked)] hover:bg-[var(--hover)] cursor-pointer"
              aria-label={`Close ${win.title}`}
              title="Close window"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Window Body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </div>
      </section>
    );
  };

  // SVG Chart Geometry Builder for Window 1
  const chartW = 580;
  const chartH = 185;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const maxVal = 80; // Cr

  const getCoord = (idx: number, val: number, count: number) => {
    const x =
      padL + (count <= 1 ? innerW / 2 : (idx / (count - 1)) * innerW);
    const y = padT + innerH - (Math.min(val, maxVal) / maxVal) * innerH;
    return { x, y };
  };

  const buildPolyline = (getter: (p: FinancialPoint) => number) =>
    visibleFinancialPoints
      .map((p, idx) => {
        const { x, y } = getCoord(idx, getter(p), visibleFinancialPoints.length);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const buildAreaPath = (getter: (p: FinancialPoint) => number) => {
    if (visibleFinancialPoints.length === 0) return '';
    const coords = visibleFinancialPoints.map((p, idx) =>
      getCoord(idx, getter(p), visibleFinancialPoints.length)
    );
    const first = coords[0];
    const last = coords[coords.length - 1];
    const linePart = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    return `${linePart} L ${last.x.toFixed(1)} ${(padT + innerH).toFixed(
      1
    )} L ${first.x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  };

  return (
    <div
      className="space-y-4"
      onMouseMove={(e) => {
        if (!draggingWin) return;
        const dx = e.clientX - draggingWin.startX;
        const dy = e.clientY - draggingWin.startY;
        setWindows((prev) =>
          prev.map((w) =>
            w.id === draggingWin.id
              ? {
                  ...w,
                  x: Math.max(0, draggingWin.origX + dx),
                  y: Math.max(0, draggingWin.origY + dy),
                }
              : w
          )
        );
      }}
      onMouseUp={() => {
        if (draggingWin) setDraggingWin(null);
      }}
    >
      {/* OS Workspace Control Bar & Executive Telemetry Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <h1 className="t-20 text-[var(--text-primary)]">
              Enterprise OS Workspace
            </h1>
            <p className="t-12 text-[var(--text-secondary)]">
              Unified CRM pipeline, ERP inventory & supply chain, and live financial telemetry
            </p>
          </div>

          {/* Inline Executive Metrics */}
          <div className="hidden xl:flex items-center gap-6 pl-6 border-l border-[var(--border)]">
            <div>
              <div className="t-12 text-[var(--text-tertiary)]">
                Recognized ERP Revenue
              </div>
              <div
                className="t-16 t-mono text-[var(--text-primary)]"
                title={formatInrFull(totalCommittedRevenue)}
              >
                {formatInr(totalCommittedRevenue)}
              </div>
            </div>
            <div>
              <div className="t-12 text-[var(--text-tertiary)]">
                Active CRM Pipeline
              </div>
              <div
                className="t-16 t-mono text-[var(--text-primary)]"
                title={formatInrFull(totalPipelineBudget)}
              >
                {formatInr(totalPipelineBudget)}
              </div>
            </div>
            <div>
              <div className="t-12 text-[var(--text-tertiary)]">
                Available ERP Stock
              </div>
              <div className="t-16 t-mono text-[var(--text-primary)]">
                {availableUnitsCount} / {units.length} units
              </div>
            </div>
          </div>
        </div>

        {/* Window Manager Layout Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Tiled vs Floating OS Mode Switcher */}
          <div
            role="tablist"
            aria-label="Window manager layout mode"
            className="inline-flex items-center p-0.5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={layoutMode === 'tiled'}
              onClick={() => setLayoutMode('tiled')}
              className={`h-[26px] px-2.5 rounded-[4px] t-12 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                layoutMode === 'tiled'
                  ? 'bg-[var(--hover)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tiled Grid</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={layoutMode === 'floating'}
              onClick={() => resetSplitFloatingWindows()}
              className={`h-[26px] px-2.5 rounded-[4px] t-12 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                layoutMode === 'floating'
                  ? 'bg-[var(--hover)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Floating Windows</span>
            </button>
          </div>

          {layoutMode === 'floating' && (
            <button
              type="button"
              onClick={cascadeFloatingWindows}
              className="btn-secondary btn-sm"
            >
              Cascade Windows
            </button>
          )}

          {/* Quick Window Toggles */}
          <div className="flex items-center gap-1">
            {windows.map((w) => {
              const active = w.isOpen && !w.isMinimized;
              const shortLabel =
                w.id === 'finance-chart'
                  ? 'Finance'
                  : w.id === 'crm-profiles'
                  ? 'CRM'
                  : w.id === 'workflow-graph'
                  ? 'Workflow'
                  : 'ERP';
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    if (!w.isOpen || w.isMinimized) {
                      closeOrOpenWindow(w.id, true);
                    } else {
                      focusWindow(w.id);
                    }
                  }}
                  className={`h-7 px-2.5 rounded-[6px] t-12 border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main OS Windowing Canvas */}
      <div
        className={
          layoutMode === 'tiled'
            ? 'grid grid-cols-12 gap-4 items-stretch'
            : 'os-canvas-grid relative w-full h-[860px] rounded-[8px] border border-[var(--border)] overflow-auto'
        }
      >
        {/* ============================================================
            WINDOW 1: LIVE FINANCIAL LINE CHART WITH INTERACTIVE NODES
           ============================================================ */}
        {renderWindowFrame(
          windows.find((w) => w.id === 'finance-chart')!,
          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
            {/* Top Controls & Selected Node Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <div className="t-12 text-[var(--text-tertiary)]">
                    Selected Node ({inspectedPoint.month} 2026)
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="t-20 t-mono text-[var(--text-primary)]">
                      ₹{inspectedPoint.revenueCr.toFixed(2)} Cr
                    </span>
                    <span className="t-12 t-mono text-[var(--accent)]">
                      +{inspectedPoint.yoyGrowthPct.toFixed(1)}% YoY
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block pl-4 border-l border-[var(--border)]">
                  <div className="t-12 text-[var(--text-tertiary)]">
                    CRM Pipeline
                  </div>
                  <div className="t-14 t-mono text-[var(--text-primary)] mt-0.5">
                    ₹{inspectedPoint.pipelineCr.toFixed(2)} Cr
                  </div>
                </div>

                <div className="hidden md:block pl-4 border-l border-[var(--border)]">
                  <div className="t-12 text-[var(--text-tertiary)]">
                    Operating Margin
                  </div>
                  <div className="t-14 t-mono text-[var(--text-primary)] mt-0.5">
                    {inspectedPoint.operatingMarginPct.toFixed(1)}% ·{' '}
                    {inspectedPoint.dealsClosed} deals
                  </div>
                </div>
              </div>

              {/* Horizon & Series Toggles */}
              <div className="flex items-center gap-1.5">
                {(['ALL', 'H1', 'H2'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHorizon(h);
                      setSelectedMonthIdx(0);
                    }}
                    className={`h-6 px-2 rounded-[4px] t-12 t-mono cursor-pointer ${
                      horizon === h
                        ? 'bg-[var(--hover)] text-[var(--accent)] font-medium'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Multi-Series Line Chart */}
            <div className="relative flex-1 min-h-[185px] flex items-center">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-full overflow-visible select-none"
                role="img"
                aria-label="Financial revenue, CRM pipeline, and supply chain CapEx line chart"
              >
                <defs>
                  <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[0, 20, 40, 60, 80].map((tick) => {
                  const y = padT + innerH - (tick / maxVal) * innerH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="var(--border)"
                        strokeDasharray={tick === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={padL - 6}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-[var(--text-tertiary)] text-[9px] font-mono"
                      >
                        {tick}Cr
                      </text>
                    </g>
                  );
                })}

                {/* Active Vertical Crosshair for Selected Node */}
                {(() => {
                  const activeCoord = getCoord(
                    safeSelectedIdx,
                    inspectedPoint.revenueCr,
                    visibleFinancialPoints.length
                  );
                  return (
                    <line
                      x1={activeCoord.x}
                      y1={padT}
                      x2={activeCoord.x}
                      y2={padT + innerH}
                      stroke="var(--accent)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  );
                })()}

                {/* CRM Pipeline Line (Slate dashed) */}
                {showPipelineLine && (
                  <polyline
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="1.75"
                    strokeDasharray="4 3"
                    points={buildPolyline((p) => p.pipelineCr)}
                  />
                )}

                {/* Supply Chain CapEx Line */}
                {showCapexLine && (
                  <polyline
                    fill="none"
                    stroke="#A855F7"
                    strokeOpacity="0.65"
                    strokeWidth="1.5"
                    points={buildPolyline((p) => p.supplyCapexCr)}
                  />
                )}

                {/* Recognized Revenue Area & Primary Electric Blue Line */}
                {showRevenueLine && (
                  <>
                    <path
                      d={buildAreaPath((p) => p.revenueCr)}
                      fill="url(#revAreaGrad)"
                    />
                    <polyline
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2.25"
                      points={buildPolyline((p) => p.revenueCr)}
                    />
                  </>
                )}

                {/* Interactive Data Nodes */}
                {visibleFinancialPoints.map((pt, idx) => {
                  const revCoord = getCoord(
                    idx,
                    pt.revenueCr,
                    visibleFinancialPoints.length
                  );
                  const pipeCoord = getCoord(
                    idx,
                    pt.pipelineCr,
                    visibleFinancialPoints.length
                  );
                  const isSelected = idx === safeSelectedIdx;

                  return (
                    <g
                      key={pt.month}
                      className="cursor-pointer"
                      onClick={() => setSelectedMonthIdx(idx)}
                    >
                      {/* Invisible wider hit column for effortless node clicking */}
                      <rect
                        x={revCoord.x - 16}
                        y={padT}
                        width={32}
                        height={innerH + 20}
                        fill="transparent"
                      />

                      {showPipelineLine && (
                        <circle
                          cx={pipeCoord.x}
                          cy={pipeCoord.y}
                          r={isSelected ? 4 : 2.5}
                          fill="var(--surface)"
                          stroke="#94A3B8"
                          strokeWidth="1.5"
                        />
                      )}

                      {showRevenueLine && (
                        <>
                          {isSelected && (
                            <circle
                              cx={revCoord.x}
                              cy={revCoord.y}
                              r={8}
                              fill="var(--accent)"
                              fillOpacity="0.2"
                            />
                          )}
                          <circle
                            cx={revCoord.x}
                            cy={revCoord.y}
                            r={isSelected ? 4.5 : 3}
                            fill={
                              isSelected ? 'var(--accent)' : 'var(--surface)'
                            }
                            stroke="var(--accent)"
                            strokeWidth="2"
                          />
                        </>
                      )}

                      {/* X-Axis Month Label */}
                      <text
                        x={revCoord.x}
                        y={chartH - 6}
                        textAnchor="middle"
                        className={`text-[10px] font-mono ${
                          isSelected
                            ? 'fill-[var(--text-primary)] font-semibold'
                            : 'fill-[var(--text-tertiary)]'
                        }`}
                      >
                        {pt.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Interactive Series Filter Footer */}
            <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 t-12">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowRevenueLine((v) => !v)}
                  className={`inline-flex items-center gap-1.5 cursor-pointer ${
                    showRevenueLine
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-tertiary)] line-through'
                  }`}
                >
                  <span
                    className="w-2.5 h-0.5"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                  <span>Recognized Revenue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPipelineLine((v) => !v)}
                  className={`inline-flex items-center gap-1.5 cursor-pointer ${
                    showPipelineLine
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-tertiary)] line-through'
                  }`}
                >
                  <span className="w-2.5 h-0.5 bg-slate-400" />
                  <span>CRM Pipeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCapexLine((v) => !v)}
                  className={`inline-flex items-center gap-1.5 cursor-pointer ${
                    showCapexLine
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-tertiary)] line-through'
                  }`}
                >
                  <span className="w-2.5 h-0.5 bg-purple-400/70" />
                  <span>Supply CapEx</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveScreen('finance')}
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open full ledger</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>,
          'col-span-12 lg:col-span-6'
        )}

        {/* ============================================================
            WINDOW 3: AUTOMATED WORKFLOW NODE GRAPH (CRM-TO-ERP DAG)
           ============================================================ */}
        {renderWindowFrame(
          windows.find((w) => w.id === 'workflow-graph')!,
          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
            {/* Top Workflow Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 t-12">
                <span className="text-[var(--text-secondary)]">
                  Pipeline: <strong className="text-[var(--text-primary)]">Lead-to-Escrow Settlement DAG</strong>
                </span>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="t-mono text-[var(--text-secondary)]">
                  {simulationRuns} executions
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runWorkflowSimulation}
                  disabled={activeSimulationStep !== null}
                  className="btn-primary btn-sm"
                >
                  <Play className="w-3 h-3" />
                  <span>
                    {activeSimulationStep !== null
                      ? `Executing Step ${activeSimulationStep + 1}/5...`
                      : 'Run Workflow'}
                  </span>
                </button>
              </div>
            </div>

            {/* Node Graph Canvas */}
            <div className="relative flex-1 min-h-[205px] rounded-[6px] border border-[var(--border)] bg-[var(--bg)]/70 os-canvas-grid overflow-x-auto overflow-y-hidden">
              <div className="relative min-w-[630px] h-[205px]">
                {/* SVG Connector Cables */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {WORKFLOW_EDGES.map((edge, idx) => {
                    const fromNode = wfNodes.find((n) => n.id === edge.from);
                    const toNode = wfNodes.find((n) => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const x1 = fromNode.x + 150;
                    const y1 = fromNode.y + 26;
                    const x2 = toNode.x;
                    const y2 = toNode.y + 26;
                    const cx1 = x1 + (x2 - x1) * 0.5;
                    const cx2 = x1 + (x2 - x1) * 0.5;
                    const pathData = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;

                    const isSimActive = activeSimulationStep !== null;

                    return (
                      <g key={`${edge.from}-${edge.to}-${idx}`}>
                        <path
                          d={pathData}
                          fill="none"
                          stroke={
                            isSimActive
                              ? 'var(--accent)'
                              : 'var(--border-strong)'
                          }
                          strokeWidth={isSimActive ? '2' : '1.5'}
                        />
                        {/* Endpoint Port Dots */}
                        <circle
                          cx={x1}
                          cy={y1}
                          r="3"
                          fill="var(--surface)"
                          stroke="var(--accent)"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={x2}
                          cy={y2}
                          r="3"
                          fill="var(--surface)"
                          stroke="var(--accent)"
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Interactive HTML Workflow Nodes */}
                {wfNodes.map((node, idx) => {
                  const isSelected = node.id === selectedNodeId;
                  const isRunningThisNode = activeSimulationStep === idx;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: '150px',
                      }}
                      className={`absolute p-2.5 rounded-[6px] text-left transition-all cursor-pointer border ${
                        isRunningThisNode
                          ? 'bg-[var(--surface)] border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                          : isSelected
                          ? 'bg-[var(--surface)] border-[var(--accent)]'
                          : 'bg-[var(--surface)]/90 border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)] truncate">
                          {node.category}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            node.enabled
                              ? 'text-[var(--accent)]'
                              : 'text-[var(--text-tertiary)]'
                          }`}
                        >
                          {node.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="t-12 font-semibold text-[var(--text-primary)] truncate mt-0.5">
                        {node.title}
                      </div>
                      <div className="text-[11px] t-mono text-[var(--text-secondary)] truncate mt-1">
                        {node.metric}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Node Inspector Bar */}
            <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 t-12">
              <div className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="font-medium text-[var(--text-primary)]">
                  {inspectedNode.title}:
                </span>
                <span className="text-[var(--text-secondary)]">
                  {inspectedNode.configLabel} ={' '}
                  <strong className="t-mono text-[var(--text-primary)]">
                    {inspectedNode.configValue}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setWfNodes((prev) =>
                    prev.map((n) =>
                      n.id === inspectedNode.id
                        ? { ...n, enabled: !n.enabled }
                        : n
                    )
                  )
                }
                className="btn-secondary btn-sm"
              >
                {inspectedNode.enabled ? 'Disable Node' : 'Enable Node'}
              </button>
            </div>
          </div>,
          'col-span-12 lg:col-span-6'
        )}

        {/* ============================================================
            WINDOW 2: CUSTOMER PROFILES & RICH CRM DATA TABLE
           ============================================================ */}
        {renderWindowFrame(
          windows.find((w) => w.id === 'crm-profiles')!,
          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
            {/* Active Customer Profile Spotlight Card */}
            {inspectedCustomer && (
              <div className="p-3 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Crisp Monogram Avatar */}
                  <div className="w-10 h-10 rounded-[6px] bg-[var(--hover)] border border-[var(--border-strong)] flex items-center justify-center t-mono font-semibold text-[var(--accent)] shrink-0">
                    {inspectedCustomer.buyerName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="t-14 font-semibold text-[var(--text-primary)] truncate">
                        {inspectedCustomer.buyerName}
                      </span>
                      <span className="t-12 text-[var(--text-tertiary)]">·</span>
                      <span className="t-12 text-[var(--accent)] font-medium">
                        {inspectedCustomer.stage}
                      </span>
                    </div>
                    <div className="t-12 text-[var(--text-secondary)] truncate mt-0.5">
                      {
                        projects.find(
                          (p) => p.id === inspectedCustomer.projectId
                        )?.name
                      }{' '}
                      · {inspectedCustomer.interestedBhk} ·{' '}
                      <span className="t-mono">
                        {maskPhone(
                          inspectedCustomer.phone,
                          role === 'Admin' ||
                            inspectedCustomer.assignedBrokerId ===
                              activeBrokerId
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right mr-2 hidden sm:block">
                    <div className="t-12 text-[var(--text-tertiary)]">
                      Target Budget
                    </div>
                    <div className="t-14 t-mono font-semibold text-[var(--text-primary)]">
                      {formatInr(inspectedCustomer.budgetInr)}
                    </div>
                  </div>

                  {inspectedCustomer.stage !== 'Booked' ? (
                    <button
                      type="button"
                      onClick={() =>
                        openBookingModal({
                          leadId: inspectedCustomer.id,
                          projectId: inspectedCustomer.projectId,
                          unitId: inspectedCustomer.preferredUnitId,
                        })
                      }
                      className="btn-primary btn-sm"
                    >
                      Convert to Booking
                    </button>
                  ) : (
                    <span className="t-12 t-mono text-[var(--status-available)]">
                      Allotted
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Search & Stage Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  placeholder="Filter customer profiles, phone, or configuration..."
                  aria-label="Filter customer profiles"
                  className="input-control h-7 pl-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-1">
                {(['All', 'New', 'Site Visit', 'Negotiation', 'Booked'] as const).map(
                  (stg) => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => setCrmStageFilter(stg)}
                      className={`h-7 px-2 rounded-[4px] t-12 cursor-pointer whitespace-nowrap ${
                        crmStageFilter === stg
                          ? 'bg-[var(--hover)] text-[var(--accent)] font-medium'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {stg}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* High-Density Customer Data Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--surface)] border-y border-[var(--border)]">
                  <tr className="h-8 text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                    <th className="px-2.5">Customer Profile</th>
                    <th className="px-2.5">Project · Unit Spec</th>
                    <th className="px-2.5">Stage</th>
                    <th className="px-2.5 text-right">Budget</th>
                    <th className="px-2.5 text-right">Updated</th>
                    <th className="px-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] t-12">
                  {scopedLeads.map((lead) => {
                    const proj = projects.find((p) => p.id === lead.projectId);
                    const isSelected = lead.id === inspectedCustomer?.id;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedProfileLeadId(lead.id)}
                        className={`h-9 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--hover)]/90'
                            : 'hover:bg-[var(--hover)]/50'
                        }`}
                      >
                        <td className="px-2.5 font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                          {lead.buyerName}
                        </td>
                        <td className="px-2.5 text-[var(--text-secondary)] truncate max-w-[180px]">
                          {proj?.name} · {lead.interestedBhk}
                        </td>
                        <td className="px-2.5 text-[var(--text-primary)]">
                          {lead.stage}
                        </td>
                        <td className="px-2.5 text-right t-mono text-[var(--text-primary)]">
                          {formatInr(lead.budgetInr)}
                        </td>
                        <td className="px-2.5 text-right t-mono text-[var(--text-tertiary)]">
                          {formatRelativeAge(lead.createdAt)}
                        </td>
                        <td
                          className="px-2.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.stage !== 'Booked' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const nextStage: LeadStage =
                                  lead.stage === 'New'
                                    ? 'Site Visit'
                                    : lead.stage === 'Site Visit'
                                    ? 'Negotiation'
                                    : 'Negotiation';
                                updateLeadStage(lead.id, nextStage);
                              }}
                              className="text-[var(--accent)] hover:underline cursor-pointer"
                            >
                              Advance
                            </button>
                          ) : (
                            <span className="t-mono text-[var(--text-tertiary)]">
                              Locked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>,
          'col-span-12 lg:col-span-7'
        )}

        {/* ============================================================
            WINDOW 4: ERP SUPPLY CHAIN & LIVE INVENTORY MATRIX
           ============================================================ */}
        {renderWindowFrame(
          windows.find((w) => w.id === 'erp-supply')!,
          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
            {/* Sub-tab Selector: ERP Unit Inventory vs Supply Chain Orders */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center p-0.5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setErpSubTab('inventory')}
                  className={`h-6 px-2.5 rounded-[4px] t-12 cursor-pointer ${
                    erpSubTab === 'inventory'
                      ? 'bg-[var(--hover)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Unit Stacking Matrix ({units.length})
                </button>
                <button
                  type="button"
                  onClick={() => setErpSubTab('supply')}
                  className={`h-6 px-2.5 rounded-[4px] t-12 cursor-pointer ${
                    erpSubTab === 'supply'
                      ? 'bg-[var(--hover)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Supply Chain POs ({supplyOrders.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveScreen('projects')}
                className="t-12 text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Full 2D/3D Matrix</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {erpSubTab === 'inventory' ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                {/* Compact Unit Grid for The Sovereign Skyline */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {units
                    .filter((u) => u.projectId === 'proj-skyline')
                    .slice(0, 24)
                    .map((u) => {
                      const price = getUnitAllInclusivePrice(u);
                      const statusStyles =
                        u.status === 'Available'
                          ? {
                              backgroundColor: 'var(--status-available-bg)',
                              borderColor: 'var(--status-available-border)',
                            }
                          : u.status === 'Hold'
                          ? {
                              backgroundColor: 'var(--status-hold-bg)',
                              borderColor: 'var(--status-hold-border)',
                            }
                          : {
                              backgroundColor: 'var(--status-sold-bg)',
                              borderColor: 'var(--status-sold-border)',
                            };

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(u.projectId);
                            setSelectedUnitId(u.id);
                          }}
                          style={statusStyles}
                          title={`Unit ${u.unitNumber} · ${u.bhk} · ${formatInr(
                            price
                          )}`}
                          className="h-11 px-2 rounded-[5px] border flex flex-col items-start justify-center transition-transform hover:scale-[1.02] cursor-pointer"
                        >
                          <span className="t-12 t-mono font-semibold text-[var(--text-primary)] leading-none">
                            {u.unitNumber}
                          </span>
                          <span className="text-[10px] t-mono text-[var(--text-secondary)] mt-1 leading-none">
                            {formatInr(price).replace('₹', '')}
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* Status Legend & Quick Note */}
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between t-12 text-[var(--text-secondary)]">
                  <div className="flex items-center gap-3">
                    <UnitStatusBadge status="Available" />
                    <UnitStatusBadge status="Hold" />
                    <UnitStatusBadge status="Sold" />
                  </div>
                  <span className="t-mono text-[var(--text-tertiary)]">
                    Click any unit for cost sheet
                  </span>
                </div>
              </div>
            ) : (
              /* ERP Supply Chain & Material Orders Table */
              <div className="space-y-2 flex-1 overflow-y-auto">
                {supplyOrders.map((po) => (
                  <div
                    key={po.id}
                    className="p-2.5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="t-12 t-mono text-[var(--accent)]">
                          {po.id}
                        </span>
                        <span className="t-12 font-medium text-[var(--text-primary)] truncate">
                          {po.material}
                        </span>
                      </div>
                      <div className="t-12 text-[var(--text-tertiary)] truncate mt-0.5">
                        {po.vendor} · {po.project} · ETA{' '}
                        <span className="t-mono">{po.eta}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="t-12 t-mono font-medium text-[var(--text-primary)]">
                        {formatInr(po.amountInr)}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSupplyOrders((prev) =>
                            prev.map((item) =>
                              item.id === po.id
                                ? {
                                    ...item,
                                    status:
                                      item.status === 'Customs Hold'
                                        ? 'In Transit'
                                        : 'On Schedule',
                                    fulfillmentPct: Math.min(
                                      100,
                                      item.fulfillmentPct + 10
                                    ),
                                  }
                                : item
                            )
                          )
                        }
                        className="t-12 t-mono text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
                      >
                        {po.status} · {po.fulfillmentPct}%
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>,
          'col-span-12 lg:col-span-5'
        )}
      </div>

      {/* Bottom OS Minimized/Closed Window Taskbar Dock */}
      {windows.some((w) => !w.isOpen || w.isMinimized) && (
        <div className="p-2.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
          <span className="t-12 text-[var(--text-tertiary)]">
            Minimized / Closed OS Windows:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {windows
              .filter((w) => !w.isOpen || w.isMinimized)
              .map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => closeOrOpenWindow(w.id, true)}
                  className="btn-secondary btn-sm"
                >
                  <span>Restore {w.title}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
