import React, { useState, useRef, useEffect } from 'react';
import {
  useSolexStore,
  formatInrCompact,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import {
  X,
  Send,
  Bot,
  User,
  Zap,
  Cpu,
  BrainCircuit,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

type ModelTier = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';

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

  const [selectedModel, setSelectedModel] = useState<ModelTier>('gemini-3.8-flash');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Welcome to the soleX Deal & Mandate Copilot. I have real-time visibility into your project inventory, buyer lead stages, and channel partner commissions. How can I assist with your mandate operations today?',
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isCopilotOpen) return null;

  const activeBroker = brokers.find((b) => b.id === activeBrokerId);
  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Build live portfolio state summary for grounding Gemini responses
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
              `Unit ${u.unitNumber} (${u.bhk}, ${u.carpetAreaSqFt} sq.ft, ${formatInrCompact(
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
          `- ${l.buyerName} (${l.stage}, ${l.interestedBhk}, Budget ${formatInrCompact(
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
Pending Commissions in Current Scope: ${formatInrCompact(pendingCommInr)}

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
        throw new Error(data.error || 'Failed to get response from Deal Copilot');
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
        err instanceof Error ? err.message : 'Unable to reach Deal Copilot service.';
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
          `Which 3 BHK units are currently Available in ${activeProject.name}?`,
          'Summarize pending broker commissions and top-performing leads.',
          `Draft an executive mandate absorption update for ${activeProject.name}.`,
        ]
      : [
          `Recommend the best available unit in ${activeProject.name} for Siddharth Kapoor.`,
          'Draft a WhatsApp cost-sheet pitch with GST & stamp duty for a 3 BHK.',
          'What is my total pending and approved brokerage payout?',
        ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/35 transition-opacity"
        onClick={() => setCopilotOpen(false)}
      />

      {/* Slide-Over Panel */}
      <aside className="relative z-10 w-full max-w-lg bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">soleX Deal & Mandate Copilot</h2>
                <div className="text-xs text-slate-400">
                  Role Context:{' '}
                  <span className="text-indigo-300 font-medium">
                    {role === 'Admin'
                      ? 'Mandate HQ Admin'
                      : `Broker · ${activeBroker?.name}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      role: 'model',
                      text: 'Conversation reset. Ready with your latest live inventory and lead pipeline state.',
                      modelUsed: selectedModel,
                    },
                  ])
                }
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCopilotOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close Copilot"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Model Tier Selector */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
              Reasoning Engine:
            </span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedModel === 'gemini-3.1-flash-lite'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Fast lookup (gemini-3.1-flash-lite)"
              >
                <Zap className="w-3 h-3" />
                <span>Fast Lite</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3.8-flash')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedModel === 'gemini-3.8-flash'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="General tasks (gemini-3.8-flash)"
              >
                <Cpu className="w-3 h-3" />
                <span>3.8 Flash</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-4-argon')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedModel === 'gemini-4-argon'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Complex deal & mandate reasoning (gemini-4-argon)"
              >
                <BrainCircuit className="w-3 h-3" />
                <span>4 Argon</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>

              <div
                className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                {msg.modelUsed && msg.role === 'model' && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                    Model: {msg.modelUsed}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
                Analyzing live mandate state with {selectedModel}...
              </div>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Quick Prompts + Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendPrompt(qp)}
                disabled={isLoading}
                className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
              >
                {qp}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendPrompt(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about available units, cost sheets, or broker commissions..."
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
};
