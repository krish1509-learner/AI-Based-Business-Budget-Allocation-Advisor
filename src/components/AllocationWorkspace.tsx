import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Check,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  AiAuditResult,
  BusinessProfile,
  CompanyStage,
  DepartmentAllocation,
  StrategicObjective,
} from '../types/budget';

interface AllocationWorkspaceProps {
  profile: BusinessProfile;
  auditResult: AiAuditResult | null;
  isAnalyzing: boolean;
  onUpdateProfile: (updated: BusinessProfile) => void;
  onRunAudit: () => void;
  onResetPreset: () => void;
}

const OBJECTIVES: StrategicObjective[] = [
  'Balanced Growth',
  'Profitability & Margin',
  'Aggressive Expansion',
  'R&D Innovation',
];

const STAGES: CompanyStage[] = [
  'Seed / Early',
  'Series A / B',
  'Growth Equity',
  'Enterprise / Mature',
];

const CATEGORY_COLORS: Record<DepartmentAllocation['category'], string> = {
  'R&D': 'bg-zinc-100',
  Growth: 'bg-zinc-400',
  Operations: 'bg-zinc-500',
  'G&A': 'bg-zinc-600',
  Reserve: 'bg-emerald-400/80',
};

export const AllocationWorkspace: React.FC<AllocationWorkspaceProps> = ({
  profile,
  auditResult,
  isAnalyzing,
  onUpdateProfile,
  onRunAudit,
  onResetPreset,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCategory, setNewDeptCategory] = useState<DepartmentAllocation['category']>('Operations');
  const [newDeptPercent, setNewDeptPercent] = useState('5');
  const [newDeptNote, setNewDeptNote] = useState('');

  const totalPercent = profile.departments.reduce((sum, d) => sum + d.currentPercent, 0);
  const totalRounded = Math.round(totalPercent * 10) / 10;
  const isBalanced = Math.abs(totalRounded - 100) < 0.05;

  const updateDept = (id: string, patch: Partial<DepartmentAllocation>) => {
    onUpdateProfile({
      ...profile,
      departments: profile.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  };

  const handleNormalize = () => {
    const unlocked = profile.departments.filter((d) => !d.locked);
    const lockedSum = profile.departments
      .filter((d) => d.locked)
      .reduce((sum, d) => sum + d.currentPercent, 0);
    const available = Math.max(0, 100 - lockedSum);
    const unlockedSum = unlocked.reduce((sum, d) => sum + d.currentPercent, 0);

    if (unlocked.length === 0) return;

    const updated = profile.departments.map((d) => {
      if (d.locked) return d;
      if (unlockedSum === 0) {
        return { ...d, currentPercent: Math.round((available / unlocked.length) * 10) / 10 };
      }
      return {
        ...d,
        currentPercent: Math.round(((d.currentPercent / unlockedSum) * available) * 10) / 10,
      };
    });

    // Ensure exact 100.0 sum
    const sumAfter = updated.reduce((s, d) => s + d.currentPercent, 0);
    const remainder = Math.round((100 - sumAfter) * 10) / 10;
    const firstUnlockedIdx = updated.findIndex((d) => !d.locked && d.currentPercent + remainder >= 0);
    if (firstUnlockedIdx >= 0 && Math.abs(remainder) > 0) {
      updated[firstUnlockedIdx] = {
        ...updated[firstUnlockedIdx],
        currentPercent: Math.round((updated[firstUnlockedIdx].currentPercent + remainder) * 10) / 10,
      };
    }

    onUpdateProfile({ ...profile, departments: updated });
  };

  const handleApplyAllTargets = () => {
    onUpdateProfile({
      ...profile,
      departments: profile.departments.map((d) =>
        d.locked ? d : { ...d, currentPercent: d.targetPercent }
      ),
    });
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDeptName.trim();
    const pct = Math.max(0, Math.min(100, Number(newDeptPercent) || 0));
    if (!name) return;

    const id = `dept-${Date.now().toString(36)}`;
    onUpdateProfile({
      ...profile,
      departments: [
        ...profile.departments,
        {
          id,
          name,
          category: newDeptCategory,
          currentPercent: pct,
          targetPercent: pct,
          locked: false,
          monthlyBurnNote: newDeptNote.trim() || 'Custom operating allocation',
        },
      ],
    });
    setNewDeptName('');
    setNewDeptPercent('5');
    setNewDeptNote('');
    setShowAddForm(false);
  };

  const handleRemoveDepartment = (id: string) => {
    if (profile.departments.length <= 2) return;
    onUpdateProfile({
      ...profile,
      departments: profile.departments.filter((d) => d.id !== id),
    });
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Department',
      'Category',
      'Current %',
      'Current Annual ($)',
      'Target %',
      'Target Annual ($)',
      'Variance %',
      'Locked',
      'Notes',
    ];
    const rows = profile.departments.map((d) => {
      const currDollar = Math.round((profile.annualBudget * d.currentPercent) / 100);
      const tgtDollar = Math.round((profile.annualBudget * d.targetPercent) / 100);
      const variance = (d.currentPercent - d.targetPercent).toFixed(1);
      return [
        `"${d.name.replace(/"/g, '""')}"`,
        d.category,
        d.currentPercent.toFixed(1),
        currDollar,
        d.targetPercent.toFixed(1),
        tgtDollar,
        variance,
        d.locked ? 'Yes' : 'No',
        `"${d.monthlyBurnNote.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${profile.companyName.toLowerCase().replace(/\s+/g, '-')}-budget-allocation.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const auditMap = new Map(
    (auditResult?.recommendedAllocations ?? []).map((r) => [r.departmentId, r])
  );

  return (
    <section id="allocations" className="border-b border-white/10 bg-[#0E0E10]">
      <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-14">
        {/* Section Heading & Action Toolbar */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              01. Capital Allocation Ledger
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Departmental Budget &amp; Drift Controls
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
              Adjust live operating weights, lock non-discretionary commitments, and run Gemini AI to rebalance unlocked capital toward your strategic target.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleApplyAllTargets}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/[0.09] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Apply All Targets
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:text-white hover:border-white/25 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onResetPreset}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:text-white hover:border-white/25 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        {/* Company Parameters Strip */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 rounded-xl border border-white/10 bg-[#141417] p-5">
          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Organization
            </span>
            <input
              type="text"
              value={profile.companyName}
              onChange={(e) => onUpdateProfile({ ...profile, companyName: e.target.value })}
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0E0E10] px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Annual Budget ($)
            </span>
            <input
              type="number"
              min={10000}
              step={50000}
              value={profile.annualBudget}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  annualBudget: Math.max(10000, Number(e.target.value) || 0),
                })
              }
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0E0E10] px-3 py-2 text-sm font-mono tabular-nums text-white focus:border-white/40 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Monthly Revenue ($)
            </span>
            <input
              type="number"
              min={0}
              step={10000}
              value={profile.monthlyRevenue}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  monthlyRevenue: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0E0E10] px-3 py-2 text-sm font-mono tabular-nums text-white focus:border-white/40 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Cash Reserves ($)
            </span>
            <input
              type="number"
              min={0}
              step={100000}
              value={profile.cashReserves}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  cashReserves: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0E0E10] px-3 py-2 text-sm font-mono tabular-nums text-white focus:border-white/40 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Stage
            </span>
            <select
              value={profile.stage}
              onChange={(e) =>
                onUpdateProfile({ ...profile, stage: e.target.value as CompanyStage })
              }
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0E0E10] px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              AI Objective
            </span>
            <select
              value={profile.objective}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  objective: e.target.value as StrategicObjective,
                })
              }
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0E0E10] px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
            >
              {OBJECTIVES.map((obj) => (
                <option key={obj} value={obj}>
                  {obj}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Stacked Allocation Bar + Total Balance Check */}
        <div className="mt-6 rounded-xl border border-white/10 bg-[#141417] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="font-mono uppercase tracking-wider">Portfolio Weighting</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums text-zinc-200">
                ${Math.round((profile.annualBudget * totalRounded) / 100).toLocaleString('en-US')} allocated
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isBalanced ? (
                <span className="text-xs font-mono tabular-nums text-emerald-400">
                  Total: {totalRounded.toFixed(1)}% (Balanced)
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Total: {totalRounded.toFixed(1)}% ({totalRounded > 100 ? `+${(totalRounded - 100).toFixed(1)}% over` : `${(100 - totalRounded).toFixed(1)}% unallocated`})
                  </span>
                  <button
                    type="button"
                    onClick={handleNormalize}
                    className="rounded bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer whitespace-nowrap"
                  >
                    Normalize to 100%
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-sm bg-zinc-900">
            {profile.departments.map((dept) => {
              const widthPct = totalRounded > 0 ? (dept.currentPercent / Math.max(totalRounded, 100)) * 100 : 0;
              return (
                <div
                  key={dept.id}
                  style={{ width: `${widthPct}%` }}
                  title={`${dept.name}: ${dept.currentPercent}%`}
                  className={`${CATEGORY_COLORS[dept.category]} border-r border-[#0E0E10] last:border-r-0 transition-all duration-200`}
                />
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-5 text-[11px] text-zinc-400">
            {(['R&D', 'Growth', 'Operations', 'G&A', 'Reserve'] as const).map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-xs ${CATEGORY_COLORS[cat]}`} aria-hidden="true" />
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* High-Density Departmental Ledger */}
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-[#141417]">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-5 font-medium">Department</th>
                <th className="py-3.5 px-4 font-medium w-[230px]">Current Allocation</th>
                <th className="py-3.5 px-4 font-medium text-right">Annual Spend</th>
                <th className="py-3.5 px-4 font-medium text-right">AI Target</th>
                <th className="py-3.5 px-4 font-medium text-right">Drift</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-5 font-medium text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {profile.departments.map((dept) => {
                const annualDollars = Math.round((profile.annualBudget * dept.currentPercent) / 100);
                const targetDollars = Math.round((profile.annualBudget * dept.targetPercent) / 100);
                const drift = Math.round((dept.currentPercent - dept.targetPercent) * 10) / 10;
                const absDrift = Math.abs(drift);
                const aiNote = auditMap.get(dept.id);

                let statusLabel = 'Aligned';
                let statusClass = 'text-emerald-400';
                if (absDrift >= 4) {
                  statusLabel = drift > 0 ? 'Over-Allocated' : 'Under-Funded';
                  statusClass = 'text-rose-400';
                } else if (absDrift >= 1.5) {
                  statusLabel = 'Drift Warning';
                  statusClass = 'text-amber-300';
                }

                return (
                  <tr key={dept.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5 align-top">
                      <div className="font-medium text-white">{dept.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {dept.category} <span aria-hidden="true">·</span> {dept.monthlyBurnNote}
                      </div>
                      {aiNote ? (
                        <div className="mt-1.5 text-xs text-zinc-300 max-w-md">
                          {aiNote.rationale}
                        </div>
                      ) : null}
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={75}
                          step={0.5}
                          disabled={dept.locked}
                          aria-label={`${dept.name} allocation percentage`}
                          value={dept.currentPercent}
                          onChange={(e) =>
                            updateDept(dept.id, { currentPercent: Number(e.target.value) })
                          }
                          className="strata-range w-28 disabled:opacity-40"
                        />
                        <div className="flex items-center rounded border border-white/10 bg-[#0E0E10] px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            disabled={dept.locked}
                            aria-label={`${dept.name} exact percentage`}
                            value={dept.currentPercent}
                            onChange={(e) =>
                              updateDept(dept.id, {
                                currentPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                              })
                            }
                            className="w-12 bg-transparent text-right text-xs font-mono tabular-nums text-white focus:outline-none disabled:opacity-50"
                          />
                          <span className="ml-1 text-xs font-mono text-zinc-500">%</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right align-top font-mono tabular-nums">
                      <div className="text-white">${annualDollars.toLocaleString('en-US')}</div>
                      <div className="text-xs text-zinc-500">
                        ${Math.round(annualDollars / 12).toLocaleString('en-US')}/mo
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right align-top font-mono tabular-nums">
                      <div className="text-zinc-200">{dept.targetPercent.toFixed(1)}%</div>
                      <div className="text-xs text-zinc-500">
                        ${targetDollars.toLocaleString('en-US')}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right align-top font-mono tabular-nums">
                      <span
                        className={
                          absDrift < 1.5
                            ? 'text-zinc-400'
                            : drift > 0
                              ? 'text-amber-300'
                              : 'text-sky-300'
                        }
                      >
                        {drift > 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`}
                      </span>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <span className={`text-xs font-medium ${statusClass}`}>{statusLabel}</span>
                    </td>

                    <td className="py-4 px-5 text-right align-top">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {absDrift >= 0.5 && !dept.locked ? (
                          <button
                            type="button"
                            onClick={() => updateDept(dept.id, { currentPercent: dept.targetPercent })}
                            className="rounded border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.1] cursor-pointer whitespace-nowrap"
                          >
                            Apply Target
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => updateDept(dept.id, { locked: !dept.locked })}
                          title={dept.locked ? 'Unlock department' : 'Lock department'}
                          aria-label={dept.locked ? `Unlock ${dept.name}` : `Lock ${dept.name}`}
                          className={`rounded border p-1.5 transition-colors cursor-pointer ${
                            dept.locked
                              ? 'border-white/30 bg-white/15 text-white'
                              : 'border-white/10 bg-transparent text-zinc-400 hover:text-white hover:border-white/25'
                          }`}
                        >
                          {dept.locked ? (
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>

                        {profile.departments.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveDepartment(dept.id)}
                            title="Remove department"
                            aria-label={`Remove ${dept.name}`}
                            className="rounded border border-white/10 p-1.5 text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Bar of Table */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4 bg-[#111114]">
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Department Line
              </button>
            ) : (
              <form onSubmit={handleAddDepartment} className="flex flex-wrap items-center gap-2.5 w-full">
                <input
                  type="text"
                  placeholder="Department name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  required
                  className="rounded-md border border-white/15 bg-[#0E0E10] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none"
                />
                <select
                  value={newDeptCategory}
                  onChange={(e) =>
                    setNewDeptCategory(e.target.value as DepartmentAllocation['category'])
                  }
                  className="rounded-md border border-white/15 bg-[#0E0E10] px-2.5 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
                >
                  <option value="R&D">R&amp;D</option>
                  <option value="Growth">Growth</option>
                  <option value="Operations">Operations</option>
                  <option value="G&A">G&amp;A</option>
                  <option value="Reserve">Reserve</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={newDeptPercent}
                  onChange={(e) => setNewDeptPercent(e.target.value)}
                  className="w-20 rounded-md border border-white/15 bg-[#0E0E10] px-2.5 py-1.5 text-xs font-mono tabular-nums text-white focus:border-white/40 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Spend note (optional)"
                  value={newDeptNote}
                  onChange={(e) => setNewDeptNote(e.target.value)}
                  className="flex-1 min-w-[160px] rounded-md border border-white/15 bg-[#0E0E10] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={onRunAudit}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              {isAnalyzing ? 'Computing Optimal Split...' : 'Generate AI Rebalance Plan'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
