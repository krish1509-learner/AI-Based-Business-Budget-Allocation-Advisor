import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import type { AdvisorMessage, BusinessProfile, ScenarioResult } from '../types/budget';
import { postJson } from '../lib/api';

interface ScenarioAdvisorSectionProps {
  profile: BusinessProfile;
  onApplyScenario: (scenario: ScenarioResult) => void;
}

const SCENARIO_PRESETS = [
  {
    label: '-20% Revenue Downturn',
    prompt: 'Simulate a 20% contraction in monthly recurring revenue over the next two quarters while preserving core product delivery.',
  },
  {
    label: '+30% Enterprise Hiring',
    prompt: 'Model an accelerated enterprise sales and engineering hiring wave (+30% headcount cost) to capture Q4 pipeline.',
  },
  {
    label: 'Cloud & AI Cost +25%',
    prompt: 'Assess a 25% spike in cloud compute and AI inference costs and identify where to offset burn without delaying product milestones.',
  },
  {
    label: 'New Market Expansion',
    prompt: 'Reallocate capital to support a 6-month European market launch while maintaining at least 15 months of cash runway.',
  },
];

const STARTER_QUESTIONS = [
  'How can we extend cash runway by 4 months without slowing engineering?',
  'Is our Sales & Marketing ratio efficient for our current company stage?',
  'What is the optimal reserve buffer given our current burn rate?',
];

export const ScenarioAdvisorSection: React.FC<ScenarioAdvisorSectionProps> = ({
  profile,
  onApplyScenario,
}) => {
  const [scenarioApplied, setScenarioApplied] = useState(false);
  const [scenarioInput, setScenarioInput] = useState(SCENARIO_PRESETS[0].prompt);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const runScenario = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    setIsSimulating(true);
    setScenarioError(null);
    try {
      const data = await postJson<ScenarioResult>('/api/advisor/scenario', {
        profile,
        scenario: trimmed,
      });
      setScenarioResult(data);
      setScenarioApplied(false);
    } catch (err) {
      setScenarioError(err instanceof Error ? err.message : 'Unable to simulate scenario.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleScenarioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runScenario(scenarioInput);
  };

  const sendChatQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSendingChat) return;

    const userMsg: AdvisorMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatInput('');
    setIsSendingChat(true);
    setChatError(null);

    try {
      const data = await postJson<{ reply: string }>('/api/advisor/chat', {
        profile,
        question: trimmed,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const advisorMsg: AdvisorMessage = {
        id: `a-${Date.now()}`,
        role: 'advisor',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...nextMessages, advisorMsg]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to reach advisor.');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChatQuestion(chatInput);
  };

  return (
    <section id="scenarios" className="bg-[#0E0E10]">
      <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Cols: Scenario Stress-Testing */}
          <div className="lg:col-span-7">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              03. Stress-Testing &amp; Contingency
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              What-If Scenario Simulator
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Model macroeconomic shocks or strategic expansions against {profile.companyName}&apos;s live department weights.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setScenarioInput(preset.prompt);
                    runScenario(preset.prompt);
                  }}
                  disabled={isSimulating}
                  className="rounded-md border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.08] disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleScenarioSubmit} className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={scenarioInput}
                onChange={(e) => setScenarioInput(e.target.value)}
                placeholder="Describe a revenue shock, hiring plan, or cost spike..."
                className="flex-1 rounded-md border border-white/15 bg-[#141417] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSimulating || !scenarioInput.trim()}
                className="rounded-md bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isSimulating ? 'Simulating...' : 'Simulate'}
              </button>
            </form>

            {scenarioError ? (
              <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
                <span>{scenarioError}</span>
              </div>
            ) : null}

            {isSimulating ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-[#141417] p-6 space-y-4 animate-pulse">
                <div className="h-4 w-48 rounded bg-white/10" />
                <div className="h-16 w-full rounded bg-white/5" />
                <div className="h-28 w-full rounded bg-white/5" />
              </div>
            ) : null}

            {!isSimulating && scenarioResult ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-[#141417] p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-white">
                    {scenarioResult.scenarioTitle}
                  </h3>
                  <span
                    className={`text-xs font-mono uppercase tracking-wider ${
                      scenarioResult.severityLevel === 'High'
                        ? 'text-rose-400'
                        : scenarioResult.severityLevel === 'Moderate'
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                    }`}
                  >
                    Impact: {scenarioResult.severityLevel}
                  </span>
                </div>

                <p className="mt-2.5 text-sm text-zinc-300 leading-relaxed">
                  {scenarioResult.summary}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-4 border-y border-white/10 py-4 tabular-nums">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-zinc-500">Revised Runway</div>
                    <div className="mt-1 font-display text-lg font-semibold text-white">
                      {scenarioResult.revisedRunwayMonths.toFixed(1)} mo
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono uppercase text-zinc-500">Revenue Delta</div>
                    <div className="mt-1 font-display text-lg font-semibold text-white">
                      {scenarioResult.revenueImpactPercent >= 0 ? '+' : ''}
                      {scenarioResult.revenueImpactPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono uppercase text-zinc-500">Target Reserve</div>
                    <div className="mt-1 font-display text-lg font-semibold text-white">
                      {scenarioResult.recommendedReservePercent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Departmental Adjustments
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {scenarioResult.departmentAdjustments.map((adj, idx) => (
                      <div key={idx} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                        <div>
                          <div className="font-medium text-white">{adj.departmentName}</div>
                          <div className="text-zinc-400 mt-0.5">{adj.actionNote}</div>
                        </div>
                        <div className="text-right font-mono tabular-nums shrink-0">
                          <div className={adj.recommendedAdjustmentPercent >= 0 ? 'text-emerald-400' : 'text-amber-300'}>
                            {adj.recommendedAdjustmentPercent >= 0 ? '+' : ''}
                            {adj.recommendedAdjustmentPercent.toFixed(1)}%
                          </div>
                          <div className="text-zinc-500">
                            {adj.dollarDelta >= 0 ? '+' : '-'}${Math.abs(Math.round(adj.dollarDelta)).toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      Immediate Playbook
                    </div>
                    <ol className="space-y-1.5 text-xs text-zinc-300 list-decimal list-inside">
                      {scenarioResult.immediatePlaybook.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyScenario(scenarioResult);
                      setScenarioApplied(true);
                    }}
                    className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {scenarioApplied ? 'Applied to Ledger' : 'Apply Scenario to Ledger'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right 5 Cols: Interactive CFO Budget Advisor */}
          <div className="lg:col-span-5 flex flex-col">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              04. Direct Advisory
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Ask the Budget Advisor
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Ask specific trade-off questions grounded in {profile.companyName}&apos;s live numbers.
            </p>

            <div className="mt-6 flex-1 flex flex-col rounded-xl border border-white/10 bg-[#141417] overflow-hidden min-h-[420px]">
              <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px]">
                {messages.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                      Suggested Questions
                    </p>
                    <div className="space-y-2">
                      {STARTER_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => sendChatQuestion(q)}
                          className="w-full text-left rounded-lg border border-white/10 bg-[#0E0E10] px-3.5 py-2.5 text-xs text-zinc-300 hover:border-white/25 hover:text-white transition-colors cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[90%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-white text-zinc-950 font-medium'
                            : 'border border-white/10 bg-[#0E0E10] text-zinc-200'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="mt-1 text-[10px] font-mono text-zinc-500">
                        {msg.role === 'user' ? 'You' : 'Strata Advisor'} · {msg.timestamp}
                      </span>
                    </div>
                  ))
                )}

                {isSendingChat ? (
                  <div className="text-xs font-mono text-zinc-400">Analyzing budget trade-offs...</div>
                ) : null}

                {chatError ? (
                  <div role="alert" className="text-xs text-rose-400">{chatError}</div>
                ) : null}
              </div>

              <form onSubmit={handleChatSubmit} className="border-t border-white/10 p-3 flex items-center gap-2 bg-[#111114]">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about burn, hiring trade-offs, or reserves..."
                  className="flex-1 bg-transparent px-2.5 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  aria-label="Send question"
                  className="inline-flex items-center justify-center rounded-md bg-white p-2 text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
