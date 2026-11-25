import React from 'react';
import { ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import type { AiAuditResult, BusinessProfile } from '../types/budget';
import { RunwayChart } from './RunwayChart';

interface AiAuditPanelProps {
  profile: BusinessProfile;
  auditResult: AiAuditResult | null;
  isAnalyzing: boolean;
  error: string | null;
  onRunAudit: () => void;
  onApplyAllTargets: () => void;
}

export const AiAuditPanel: React.FC<AiAuditPanelProps> = ({
  profile,
  auditResult,
  isAnalyzing,
  error,
  onRunAudit,
  onApplyAllTargets,
}) => {
  return (
    <section id="audit" className="border-b border-white/10 bg-[#0B0B0D]">
      <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              02. Gemini Capital Synthesis
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              AI Allocation Audit &amp; Runway Forecast
            </h2>
          </div>

          {auditResult ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onApplyAllTargets}
                className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                Adopt AI Recommendations
              </button>
              <button
                type="button"
                onClick={onRunAudit}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.06] disabled:opacity-60 whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh Audit
              </button>
            </div>
          ) : null}
        </div>

        {/* Error State */}
        {error ? (
          <div
            role="alert"
            className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-white">AI Audit Interrupted</h3>
                <p className="mt-1 text-sm text-rose-200">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRunAudit}
              className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Retry Audit
            </button>
          </div>
        ) : null}

        {/* Loading State */}
        {isAnalyzing ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6" aria-busy="true">
            <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#141417] p-6 space-y-4 animate-pulse">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-20 w-full rounded bg-white/5" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="h-14 rounded bg-white/5" />
                <div className="h-14 rounded bg-white/5" />
                <div className="h-14 rounded bg-white/5" />
              </div>
            </div>
            <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#141417] p-6 space-y-4 animate-pulse">
              <div className="h-4 w-44 rounded bg-white/10" />
              <div className="h-52 w-full rounded bg-white/5" />
            </div>
          </div>
        ) : null}

        {/* Empty State (before first AI audit run) */}
        {!isAnalyzing && !auditResult && !error ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-[#141417] p-10 text-center">
            <h3 className="font-display text-lg font-medium text-white">
              Ready to evaluate {profile.companyName}
            </h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-lg mx-auto">
              Run an AI allocation audit to compute department-level target shifts, annual capital efficiency gains, and a 12-month cash runway comparison.
            </p>
            <button
              type="button"
              onClick={onRunAudit}
              className="mt-6 rounded-md bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
            >
              Run AI Audit Now
            </button>
          </div>
        ) : null}

        {/* Populated AI Audit Result */}
        {!isAnalyzing && auditResult ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Executive Summary + KPIs + Rebalance Actions */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="rounded-xl border border-white/10 bg-[#141417] p-6">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Executive Diagnosis
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                  {auditResult.executiveSummary}
                </p>

                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5 tabular-nums">
                  <div>
                    <div className="text-[11px] font-mono text-zinc-500 uppercase">Projected Runway</div>
                    <div className="mt-1 font-display text-xl font-semibold text-white">
                      {auditResult.projectedRunwayMonths.toFixed(1)} mo
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Base {auditResult.baselineRunwayMonths.toFixed(1)} mo
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-zinc-500 uppercase">Est. Efficiency</div>
                    <div className="mt-1 font-display text-xl font-semibold text-emerald-400">
                      +${Math.round(auditResult.annualEfficiencyGain / 1000).toLocaleString('en-US')}K
                    </div>
                    <div className="text-[11px] text-zinc-400">Annualized impact</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-zinc-500 uppercase">Transfers</div>
                    <div className="mt-1 font-display text-xl font-semibold text-white">
                      {auditResult.rebalanceActions.length}
                    </div>
                    <div className="text-[11px] text-zinc-400">Recommended shifts</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#141417] p-6">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Rebalance Transfer Plan
                </div>

                {auditResult.rebalanceActions.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">
                    Current weights are aligned with your strategic target. No immediate capital transfers required.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-white/[0.06]">
                    {auditResult.rebalanceActions.map((act, idx) => (
                      <li key={`${act.fromDepartment}-${act.toDepartment}-${idx}`} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2 text-sm font-medium text-white">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="truncate text-zinc-400">{act.fromDepartment}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                            <span className="truncate">{act.toDepartment}</span>
                          </span>
                          <span className="font-mono tabular-nums text-emerald-400 shrink-0">
                            ${Math.round(act.amount).toLocaleString('en-US')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {act.percentShift.toFixed(1)}% shift <span aria-hidden="true">·</span> {act.impactSummary}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Right Column: Runway Chart + Key Risks */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="rounded-xl border border-white/10 bg-[#141417] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    12-Month Treasury Trajectory
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Generated {new Date(auditResult.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <RunwayChart data={auditResult.runwayProjection} />
              </div>

              <div className="rounded-xl border border-white/10 bg-[#141417] p-6">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Operational Risks &amp; Guardrails
                </div>
                <ul className="mt-3 space-y-2.5 text-sm text-zinc-300">
                  {auditResult.keyRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
