import React, { useState } from 'react';
import { useSolexStore } from '../store/useSolexStore';
import { SOLEX_SUPABASE_SCHEMA_SQL, SUPABASE_URL } from '../lib/supabase';
import { X, Copy, Check, RefreshCw } from 'lucide-react';

export const SupabaseSchemaModal: React.FC = () => {
  const {
    isSupabaseModalOpen,
    setSupabaseModalOpen,
    isSyncingSupabase,
    seedToSupabaseNow,
    initializeFromSupabase,
    projects,
    units,
    brokers,
    leads,
    bookings,
  } = useSolexStore();

  const [copied, setCopied] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isSupabaseModalOpen) return null;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SOLEX_SUPABASE_SCHEMA_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSeedNow = async () => {
    setSyncMessage(null);
    const res = await seedToSupabaseNow();
    if (res.success) {
      setSyncMessage({
        type: 'success',
        text: `Synced ${projects.length} projects, ${units.length} units, ${brokers.length} brokers, ${leads.length} leads, and ${bookings.length} bookings.`,
      });
    } else {
      setSyncMessage({
        type: 'error',
        text:
          res.error ||
          'Tables not found. Run the SQL script below in your Supabase SQL Editor first.',
      });
    }
  };

  const handlePullFromSupabase = async () => {
    setSyncMessage(null);
    await initializeFromSupabase();
    setSyncMessage({
      type: 'success',
      text: 'Refreshed state from Supabase PostgreSQL.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-label="Supabase schema and sync"
        className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] shadow-eclipse max-w-[640px] w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="t-16 text-[var(--text-primary)]">
              Supabase PostgreSQL & Sync
            </h3>
            <p className="t-12 t-mono text-[var(--text-tertiary)]">
              {SUPABASE_URL}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(false)}
            className="btn-ghost btn-sm px-2"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-[6px] bg-[var(--subtle)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="t-13 text-[var(--text-secondary)]">
              Push or pull live inventory ({units.length} units) and ledger
              state.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isSyncingSupabase}
                onClick={handlePullFromSupabase}
                className="btn-secondary btn-sm"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isSyncingSupabase ? 'animate-spin' : ''
                  }`}
                />
                <span>Pull</span>
              </button>
              <button
                type="button"
                disabled={isSyncingSupabase}
                onClick={handleSeedNow}
                className="btn-primary btn-sm"
              >
                <span>{isSyncingSupabase ? 'Syncing...' : 'Sync & seed'}</span>
              </button>
            </div>
          </div>

          {syncMessage && (
            <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--subtle)] t-12 text-[var(--text-primary)]">
              {syncMessage.text}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="t-12 text-[var(--text-secondary)]">
                SQL Editor DDL script
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="btn-secondary btn-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 rounded-[6px] bg-[var(--subtle)] text-[var(--text-primary)] t-mono text-[11px] leading-relaxed overflow-x-auto max-h-64 border border-[var(--border)]">
              {SOLEX_SUPABASE_SCHEMA_SQL}
            </pre>
          </div>
        </div>

        <div className="px-5 py-3 bg-[var(--subtle)] border-t border-[var(--border)] flex items-center justify-end">
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(false)}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
