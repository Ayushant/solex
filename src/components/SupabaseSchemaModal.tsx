import React, { useState } from 'react';
import { useSolexStore } from '../store/useSolexStore';
import { SOLEX_SUPABASE_SCHEMA_SQL, SUPABASE_URL } from '../lib/supabase';
import {
  Database,
  X,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

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
        text: `Successfully pushed ${projects.length} projects, ${units.length} units, ${brokers.length} brokers, ${leads.length} leads, and ${bookings.length} bookings to Supabase.`,
      });
    } else {
      setSyncMessage({
        type: 'error',
        text:
          res.error ||
          'Tables not found yet. Run the SQL script below in your Supabase SQL Editor first, then click Sync & Seed.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display">
                Supabase PostgreSQL Schema & Cloud Sync
              </h3>
              <p className="text-xs text-slate-400 font-mono">{SUPABASE_URL}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Cloud Table Synchronization Actions
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Push current soleX inventory ({units.length} units), leads (
                {leads.length}), and bookings ({bookings.length}) to your
                Supabase instance.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isSyncingSupabase}
                onClick={handlePullFromSupabase}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isSyncingSupabase ? 'animate-spin' : ''
                  }`}
                />
                <span>Pull Cloud Data</span>
              </button>
              <button
                type="button"
                disabled={isSyncingSupabase}
                onClick={handleSeedNow}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5" />
                <span>
                  {isSyncingSupabase ? 'Syncing...' : 'Sync & Seed Tables'}
                </span>
              </button>
            </div>
          </div>

          {syncMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                syncMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span>{syncMessage.text}</span>
            </div>
          )}

          {/* SQL Script Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Supabase SQL Editor Setup Script (One-Time DDL)
                </div>
                <div className="text-xs text-slate-500">
                  Paste this SQL in your Supabase project SQL Editor (
                  <code className="font-mono text-[11px]">
                    udnnkhhamdzgdtmufwdk
                  </code>
                  ) to create the 6 relational tables and RLS policies.
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied SQL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Script</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border border-slate-800">
              {SOLEX_SUPABASE_SCHEMA_SQL}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            All UI actions (unit holds, bookings, new leads, commission status)
            automatically sync to Supabase.
          </span>
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
