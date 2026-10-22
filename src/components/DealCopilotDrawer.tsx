import React, { useState, useRef, useEffect } from 'react';
import {
  useSolexStore,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import { formatInr } from '../lib/formatters';
import { X, RotateCcw } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

type ModelTier =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon';

export const DealCopilotDrawer: React.FC = () => {
  const {
    isCopilotOpen,
    setCopilotOpen,
    role,
    activeBrokerId,
    projects,
    units,
    leads,
    brokers,
    bookings,
    selectedProjectId,
  } = useSolexStore();

  const [selectedModel, setSelectedModel] =
    useState<ModelTier>('gemini-3.8-flash');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Ready with live project inventory, lead stages, and commission ledger state. Ask about available units, cost sheets, or payout calculations.',
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isCopilotOpen) return null;

  const activeBroker = brokers.find((b) => b.id === activeBrokerId);
  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  const buildLiveSnapshot = () => {
    const projSummaries = projects
      .map((p) => {
        const pUnits = units.filter((u) => u.projectId === p.id);
        const avail = pUnits.filter((u) => u.status === 'Available');
        const hold = pUnits.filter((u) => u.status === 'Hold');
        const sold = pUnits.filter((u) => u.status === 'Sold');
        const sampleAvail = avail
          .slice(0, 6)
          .map(
            (u) =>
              `Unit ${u.unitNumber} (${u.bhk}, ${u.carpetAreaSqFt} sq ft, ${formatInr(
                getUnitAllInclusivePrice(u)
              )})`
          )
          .join('; ');
        return `- ${p.name} (${p.location}, ${p.mandateType}, Broker Share ${p.brokerSharePct}%): ${avail.length} Available, ${hold.length} Hold, ${sold.length} Sold. Sample Available: ${sampleAvail}`;
      })
      .join('\n');

    const visibleLeads =
      role === 'Broker'
        ? leads.filter((l) => l.assignedBrokerId === activeBrokerId)
        : leads;

    const leadSummary = visibleLeads
      .map(
        (l) =>
          `- ${l.buyerName} (${l.stage}, ${l.interestedBhk}, Budget ${formatInr(
            l.budgetInr
          )})`
      )
      .join('\n');

    const visibleBookings =
      role === 'Broker'
        ? bookings.filter((b) => b.brokerId === activeBrokerId)
        : bookings;

    const pendingCommInr = visibleBookings
      .filter((b) => b.commissionStatus !== 'Released')
      .reduce((acc, b) => acc + b.commissionAmountInr, 0);

    return `Active Role: ${
      role === 'Admin'
        ? 'Mandate HQ Admin'
        : `Channel Partner (${activeBroker?.name} - ${activeBroker?.firmName})`
    }
Currently Selected Project: ${activeProject.name}
Pending Commissions in Current Scope: ${formatInr(pendingCommInr)}

Projects & Live Unit Inventory:
${projSummaries}

Active Leads in Scope:
${leadSummary}`;
  };

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          model: selectedModel,
          roleContext:
            role === 'Admin'
              ? 'Admin (Mandate HQ Director)'
              : `Broker (${activeBroker?.name} at ${activeBroker?.firmName})`,
          portfolioSnapshot: buildLiveSnapshot(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from Copilot');
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'model',
        text: data.text,
        modelUsed: data.usedModel || selectedModel,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const errText =
        err instanceof Error
          ? err.message
          : 'Unable to reach Copilot service.';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'model',
          text: `Unable to process request: ${errText}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts =
    role === 'Admin'
      ? [
          `Available 3 BHK units in ${activeProject.name}`,
          'Pending broker commissions summary',
          `Absorption status for ${activeProject.name}`,
        ]
      : [
          `Best unit in ${activeProject.name} for Siddharth Kapoor`,
          'Cost sheet breakdown with GST & stamp duty for a 3 BHK',
          'My pending and approved brokerage payouts',
        ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={() => setCopilotOpen(false)}
      />

      <aside
        role="dialog"
        aria-label="Copilot"
        className="drawer-enter relative z-10 w-full max-w-[480px] bg-[var(--surface)] h-[100dvh] border-l border-[var(--border)] shadow-eclipse flex flex-col justify-between"
      >
        {/* Ivory Header Strip */}
        <div
          className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--ivory-band)',
            borderColor: 'var(--ivory-band-border)',
          }}
        >
          <div className="min-w-0">
            <h2 className="t-16 text-[var(--text-primary)]">Copilot</h2>
            <div className="t-12 text-[var(--text-secondary)] truncate">
              {role === 'Admin'
                ? 'Mandate HQ scope'
                : `${activeBroker?.firmName} scope`}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelTier)}
              aria-label="Select model"
              className="input-control h-7 py-0 px-2 t-12 t-mono w-auto"
            >
              <option value="gemini-3.1-flash-lite">3.1-flash-lite</option>
              <option value="gemini-3.8-flash">3.8-flash</option>
              <option value="gemini-4-argon">4-argon</option>
            </select>

            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    id: `welcome-${Date.now()}`,
                    role: 'model',
                    text: 'Conversation reset.',
                    modelUsed: selectedModel,
                  },
                ])
              }
              className="btn-ghost btn-sm px-2"
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCopilotOpen(false)}
              className="btn-ghost btn-sm px-2"
              aria-label="Close Copilot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-[6px] px-3.5 py-2.5 t-13 ${
                  msg.role === 'user'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                    : 'bg-[var(--subtle)] text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
              {msg.modelUsed && msg.role === 'model' && (
                <span className="t-12 t-mono text-[var(--text-tertiary)] mt-1">
                  {msg.modelUsed}
                </span>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="t-12 text-[var(--text-tertiary)] t-mono">
              Querying {selectedModel}...
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Footer Input */}
        <div className="p-3.5 sm:p-4 border-t border-[var(--border)] bg-[var(--subtle)] space-y-2.5">
          <div className="flex sm:flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendPrompt(qp)}
                disabled={isLoading}
                className="btn-secondary btn-sm t-12 shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendPrompt(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, cost sheets, or payouts..."
              className="input-control flex-1"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-primary shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
};
