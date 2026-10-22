import React from 'react';
import type { UnitStatus, CommissionStatus } from '../store/useSolexStore';

export const PROJECT_CATEGORY_COLORS: Record<string, string> = {
  'proj-skyline': '#272757', // Eclipse
  'proj-verve': '#6D8196',   // Slate
  'proj-palms': '#2E7D5B',   // Estate green
};

export const CATEGORY_PALETTE = [
  '#272757', // eclipse
  '#6D8196', // slate
  '#8686AC', // dusk
  '#2E7D5B', // estate green
  '#B07A2E', // bronze
  '#A35A4A', // clay
];

export function getProjectColor(projectId: string, index = 0): string {
  return (
    PROJECT_CATEGORY_COLORS[projectId] ||
    CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]
  );
}

export function formatInr(amountInr: number): string {
  const abs = Math.abs(amountInr);
  const sign = amountInr < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

export function formatInrFull(amountInr: number): string {
  const sign = amountInr < 0 ? '-' : '';
  return `${sign}₹${Math.round(Math.abs(amountInr)).toLocaleString('en-IN')}`;
}

export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString('en-IN')} sq ft`;
}

export function formatPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

export function formatShortDate(isoOrLabel: string): string {
  if (!isoOrLabel) return '21 Oct, 14:30';
  if (
    isoOrLabel === 'Just now' ||
    isoOrLabel.includes('ago') ||
    isoOrLabel.includes('Oct')
  ) {
    return isoOrLabel;
  }
  const d = new Date(isoOrLabel);
  if (Number.isNaN(d.getTime())) return isoOrLabel;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon}, ${hh}:${mm}`;
}

export function formatRelativeAge(isoString: string, fallbackIndex = 0): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    const presets = ['2h ago', '1d ago', '2d ago', '4d ago', '8d ago'];
    return presets[fallbackIndex % presets.length];
  }
  const diffMs = Date.now() - d.getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function maskPhone(phone: string, canViewFull: boolean): string {
  if (canViewFull) return phone;
  const digits = phone.replace(/\D/g, '');
  const last5 = digits.slice(-5) || '55218';
  return `+91 •••• ${last5}`;
}

/**
 * Signature detail: section titles are preceded by a 6px Eclipse-600 diamond.
 * Used on section titles only.
 */
export const SectionTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <h2
    className={`inline-flex items-center gap-2 t-14-medium text-[var(--text-primary)] ${className}`}
  >
    <span
      className="w-[6px] h-[6px] rotate-45 shrink-0"
      style={{ backgroundColor: '#505081' }}
      aria-hidden="true"
    />
    <span>{children}</span>
  </h2>
);

/**
 * Project chip: a white chip with a 3px left bar in the project's category colour.
 */
export const ProjectChip: React.FC<{
  projectId: string;
  name: string;
  className?: string;
}> = ({ projectId, name, className = '' }) => {
  const barColor = getProjectColor(projectId);
  return (
    <span
      className={`inline-flex items-center h-6 pl-2 pr-2.5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] t-12 text-[var(--text-primary)] whitespace-nowrap overflow-hidden ${className}`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: barColor,
      }}
    >
      <span className="truncate">{name}</span>
    </span>
  );
};

export const MoneyText: React.FC<{
  amount: number;
  isHeadline?: boolean;
  className?: string;
}> = ({ amount, isHeadline = false, className = '' }) => {
  const colorClass =
    amount < 0
      ? 'text-[var(--status-blocked)]'
      : isHeadline
      ? 'text-[var(--money-total)]'
      : 'text-[var(--text-primary)]';
  return (
    <span
      className={`font-mono tabular-nums ${colorClass} ${className}`}
      title={formatInrFull(amount)}
    >
      {formatInr(amount)}
    </span>
  );
};

/**
 * Unit and deal status: soft tint + 700 text + dot
 * Available #2E7D5B on #E7F3EC · On hold #9A6410 on #FBF0DA · Booked #3A3A6B on #E2E2F0 · Sold #4A4A4A on #EDEDE7 · Blocked/Cancelled #A33A2E on #F8E8E5
 */
export const UnitStatusBadge: React.FC<{
  status: UnitStatus | 'Booked' | 'Blocked';
}> = ({ status }) => {
  const map: Record<
    UnitStatus | 'Booked' | 'Blocked',
    { color: string; tint: string; label: string }
  > = {
    Available: {
      color: 'var(--status-available)',
      tint: 'var(--status-available-tint)',
      label: 'Available',
    },
    Hold: {
      color: 'var(--status-hold)',
      tint: 'var(--status-hold-tint)',
      label: 'On hold',
    },
    Booked: {
      color: 'var(--status-booked)',
      tint: 'var(--status-booked-tint)',
      label: 'Booked',
    },
    Sold: {
      color: 'var(--status-sold)',
      tint: 'var(--status-sold-tint)',
      label: 'Sold',
    },
    Blocked: {
      color: 'var(--status-blocked)',
      tint: 'var(--status-blocked-tint)',
      label: 'Blocked',
    },
  };
  const cfg = map[status] || map.Available;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] t-12 whitespace-nowrap"
      style={{
        backgroundColor: cfg.tint,
        color: cfg.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.color }}
        aria-hidden="true"
      />
      <span>{cfg.label}</span>
    </span>
  );
};

export const CommissionStatusBadge: React.FC<{
  status: CommissionStatus;
}> = ({ status }) => {
  const cfg =
    status === 'Released'
      ? {
          color: 'var(--status-sold)',
          tint: 'var(--status-sold-tint)',
          label: 'Settled',
        }
      : status === 'Approved'
      ? {
          color: 'var(--status-booked)',
          tint: 'var(--status-booked-tint)',
          label: 'Approved',
        }
      : {
          color: 'var(--status-hold)',
          tint: 'var(--status-hold-tint)',
          label: 'Pending audit',
        };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] t-12 whitespace-nowrap"
      style={{
        backgroundColor: cfg.tint,
        color: cfg.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.color }}
        aria-hidden="true"
      />
      <span>{cfg.label}</span>
    </span>
  );
};

export const StatusLegend: React.FC<{
  availableCount?: number;
  holdCount?: number;
  bookedCount?: number;
  soldCount?: number;
  blockedCount?: number;
}> = ({
  availableCount,
  holdCount,
  bookedCount,
  soldCount,
  blockedCount = 0,
}) => (
  <div className="flex flex-wrap items-center gap-2.5 t-12">
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px]"
      style={{
        backgroundColor: 'var(--status-available-tint)',
        color: 'var(--status-available)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: 'var(--status-available)' }}
      />
      <span>Available</span>
      {typeof availableCount === 'number' && (
        <span className="font-mono tabular-nums">{availableCount}</span>
      )}
    </span>

    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px]"
      style={{
        backgroundColor: 'var(--status-hold-tint)',
        color: 'var(--status-hold)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: 'var(--status-hold)' }}
      />
      <span>On hold</span>
      {typeof holdCount === 'number' && (
        <span className="font-mono tabular-nums">{holdCount}</span>
      )}
    </span>

    {typeof bookedCount === 'number' && (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px]"
        style={{
          backgroundColor: 'var(--status-booked-tint)',
          color: 'var(--status-booked)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--status-booked)' }}
        />
        <span>Booked</span>
        <span className="font-mono tabular-nums">{bookedCount}</span>
      </span>
    )}

    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px]"
      style={{
        backgroundColor: 'var(--status-sold-tint)',
        color: 'var(--status-sold)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: 'var(--status-sold)' }}
      />
      <span>Sold</span>
      {typeof soldCount === 'number' && (
        <span className="font-mono tabular-nums">{soldCount}</span>
      )}
    </span>

    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px]"
      style={{
        backgroundColor: 'var(--status-blocked-tint)',
        color: 'var(--status-blocked)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: 'var(--status-blocked)' }}
      />
      <span>Blocked</span>
      {typeof blockedCount === 'number' && (
        <span className="font-mono tabular-nums">{blockedCount}</span>
      )}
    </span>
  </div>
);

/**
 * Empty state: left-aligned with a 40px Eclipse 50 tile + Eclipse 600 stroke icon,
 * one title, one guidance line, one button.
 */
export const EmptyStateBlock: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  guidance: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon: Icon, title, guidance, actionLabel, onAction }) => (
  <div className="p-6 text-left flex flex-col items-start gap-2.5">
    <div
      className="w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0"
      style={{ backgroundColor: 'var(--eclipse-50)', color: '#505081' }}
    >
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <div className="t-14-medium text-[var(--text-primary)]">{title}</div>
      <div className="t-13 text-[var(--text-secondary)] mt-0.5">{guidance}</div>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="btn-secondary btn-sm mt-1"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
