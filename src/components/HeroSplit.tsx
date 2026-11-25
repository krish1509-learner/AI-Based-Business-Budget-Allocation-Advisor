import React from 'react';
import { ArrowUpRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { AiAuditResult, BusinessProfile } from '../types/budget';

interface HeroSplitProps {
  profile: BusinessProfile;
  presets: BusinessProfile[];
  auditResult: AiAuditResult | null;
  isAnalyzing: boolean;
  onSelectPreset: (presetId: string) => void;
  onRunAudit: () => void;
  onJumpToScenarios: () => void;
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }
  return `$${Math.round(value)}`;
}

export const HeroSplit: React.FC<HeroSplitProps> = ({
  profile,
  presets,
  auditResult,
  isAnalyzing,
  onSelectPreset,
  onRunAudit,
  onJumpToScenarios,
}) => {
  // Compute live top-2 category split & max drift for the telemetry card
  const rdTotal = profile.departments
    .filter((d) => d.category === 'R&D')
    .reduce((sum, d) => sum + d.currentPercent, 0);
  const growthTotal = profile.departments
    .filter((d) => d.category === 'Growth')
    .reduce((sum, d) => sum + d.currentPercent, 0);

  let maxDriftDept = profile.departments[0];
  let maxDriftAbs = 0;
  for (const d of profile.departments) {
    const diff = Math.abs(d.currentPercent - d.targetPercent);
    if (diff > maxDriftAbs) {
      maxDriftAbs = diff;
      maxDriftDept = d;
    }
  }

  const rebalanceNeeded = maxDriftAbs >= 2;
  const monthlySpend = profile.annualBudget / 12;
  const netBurn = Math.max(0, monthlySpend - profile.monthlyRevenue);
  const runwayMonths = netBurn > 0 ? profile.cashReserves / netBurn : 48;

  // Build crisp 12-point sparkline coordinates from auditResult or baseline curve
  const sparkPoints = React.useMemo(() => {
    if (auditResult?.runwayProjection?.length) {
      return auditResult.runwayProjection.map((pt) => pt.optimizedCash);
    }
    const pts: number[] = [];
    for (let i = 0; i < 12; i++) {
      const projected = Math.max(0, profile.cashReserves - netBurn * i * 0.72 + Math.sin(i * 0.7) * (profile.cashReserves * 0.035));
      pts.push(projected);
    }
    return pts;
  }, [auditResult, profile.cashReserves, netBurn]);

  const svgPath = React.useMemo(() => {
    const min = Math.min(...sparkPoints);
    const max = Math.max(...sparkPoints);
    const range = max - min || 1;
    const width = 280;
    const height = 74;
    const coords = sparkPoints.map((val, idx) => {
      const x = (idx / Math.max(1, sparkPoints.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 16) - 8;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return coords.join(' ');
  }, [sparkPoints]);

  return (
    <section id="overview" className="border-b border-white/10">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Obsidian Column */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-[#0E0E10] px-6 py-14 lg:px-14 lg:py-20">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-2.5 text-xs font-mono tracking-wider text-zinc-400 uppercase">
              <span>Managing {formatCurrencyCompact(profile.annualBudget)} Operating Budget</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{profile.headcount} Headcount</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-medium tracking-tight text-white leading-[1.06] text-balance">
              Clarity, across every budget you allocate
            </h1>

            <p className="mt-6 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-lg">
              Strata gives finance teams real-time drift detection and Gemini-backed capital rebalancing across every department — without the spreadsheet.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onRunAudit}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors duration-150 hover:bg-zinc-200 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {isAnalyzing ? 'Running AI Audit...' : 'Run AI Audit'}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onJumpToScenarios}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-100 transition-colors duration-150 hover:bg-white/[0.08] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Simulate Scenario
              </button>
            </div>
          </div>

          {/* Preset switcher positioned cleanly at bottom of left column */}
          <div className="mt-14 pt-8 border-t border-white/10">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">
              Active Portfolio Model
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {presets.map((preset) => {
                const isActive = preset.id === profile.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset.id)}
                    className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      isActive
                        ? 'bg-white/12 text-white border border-white/25'
                        : 'bg-transparent text-zinc-400 border border-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {preset.companyName} · {preset.industry.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Brushed Metallic Silver Column */}
        <div className="lg:col-span-5 brushed-metallic-panel flex flex-col items-center justify-center px-6 py-14 lg:px-10 lg:py-16 border-t lg:border-t-0 lg:border-l border-white/10">
          <div className="relative z-10 w-full max-w-[340px] space-y-5">
            {/* Telemetry Card 1: Target Allocation & Drift */}
            <div className="rounded-xl border border-white/12 bg-[#161619]/92 p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <span>Target Allocation</span>
                <span className="tabular-nums text-zinc-500">{profile.objective}</span>
              </div>

              <div className="mt-4 flex items-baseline gap-4 tabular-nums">
                <div>
                  <div className="font-display text-3xl font-semibold text-white">
                    {rdTotal.toFixed(0)}%
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">r&amp;d</div>
                </div>
                <span className="text-2xl font-light text-zinc-600" aria-hidden="true">/</span>
                <div>
                  <div className="font-display text-3xl font-semibold text-white">
                    {growthTotal.toFixed(0)}%
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">growth</div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                {rebalanceNeeded ? (
                  <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/15 px-2.5 py-1 text-[11px] font-mono font-medium uppercase tracking-wider text-amber-300 border border-amber-500/25">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    Rebalance Needed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/15 px-2.5 py-1 text-[11px] font-mono font-medium uppercase tracking-wider text-emerald-300 border border-emerald-500/25">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    On Target
                  </span>
                )}
              </div>

              <p className="mt-2.5 text-xs text-zinc-300 tabular-nums">
                {maxDriftDept
                  ? `${maxDriftDept.name} drifted ${(maxDriftDept.currentPercent - maxDriftDept.targetPercent) >= 0 ? '+' : ''}${(maxDriftDept.currentPercent - maxDriftDept.targetPercent).toFixed(1)}%`
                  : 'All allocations aligned'}
              </p>

              <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-[11px] font-mono text-zinc-400 tabular-nums">
                <div className="flex items-center justify-between text-zinc-200">
                  <span>Runway</span>
                  <span>
                    {auditResult
                      ? `${auditResult.projectedRunwayMonths.toFixed(1)} mo projected`
                      : `${runwayMonths.toFixed(1)} mo baseline`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Next Review</span>
                  <span>FY26 Q4 Cycle</span>
                </div>
              </div>
            </div>

            {/* Telemetry Card 2: Tracked Business Treasury & Curve */}
            <div className="rounded-xl border border-white/12 bg-[#161619]/92 p-6 shadow-2xl backdrop-blur-md">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                {profile.companyName}
              </div>

              <div className="mt-3 flex items-baseline gap-3 tabular-nums">
                <span className="font-display text-2xl sm:text-3xl font-semibold text-white">
                  ${profile.annualBudget.toLocaleString('en-US')}
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {auditResult
                    ? `+${formatCurrencyCompact(auditResult.annualEfficiencyGain)} est. gain`
                    : `${formatCurrencyCompact(profile.monthlyRevenue)}/mo rev`}
                </span>
              </div>

              <div className="mt-4">
                <svg
                  viewBox="0 0 280 74"
                  className="w-full h-[74px] overflow-visible"
                  role="img"
                  aria-label="12-month cash trajectory sparkline"
                >
                  <path
                    d={svgPath}
                    fill="none"
                    stroke="rgba(255,255,255,0.72)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="pt-3 text-center">
              <h2 className="font-display text-lg font-medium text-white">
                Real-time drift detection
              </h2>
              <p className="mt-1 text-xs text-zinc-300">
                From target to rebalance — tracked automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
