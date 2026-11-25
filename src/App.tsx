import { useEffect, useState } from 'react';
import { BUSINESS_PRESETS } from './data/presets';
import type { AiAuditResult, BusinessProfile, ScenarioResult } from './types/budget';
import { TopBar } from './components/TopBar';
import { HeroSplit } from './components/HeroSplit';
import { AllocationWorkspace } from './components/AllocationWorkspace';
import { AiAuditPanel } from './components/AiAuditPanel';
import { ScenarioAdvisorSection } from './components/ScenarioAdvisorSection';
import { postJson } from './lib/api';

const STORAGE_KEY = 'strata_budget_profile_v1';

function loadInitialProfile(): BusinessProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BusinessProfile;
      if (parsed && Array.isArray(parsed.departments) && parsed.departments.length >= 2) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default preset
  }
  return BUSINESS_PRESETS[0];
}

export default function App() {
  const [profile, setProfile] = useState<BusinessProfile>(loadInitialProfile);
  const [auditResult, setAuditResult] = useState<AiAuditResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  const handleSelectPreset = (presetId: string) => {
    const found = BUSINESS_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setProfile(structuredClone(found));
    setAuditResult(null);
    setAuditError(null);
  };

  const handleResetPreset = () => {
    const matchingPreset =
      BUSINESS_PRESETS.find((p) => p.id === profile.id) ?? BUSINESS_PRESETS[0];
    setProfile(structuredClone(matchingPreset));
    setAuditResult(null);
    setAuditError(null);
  };

  const handleApplyAllTargets = () => {
    setProfile((prev) => ({
      ...prev,
      departments: prev.departments.map((d) =>
        d.locked ? d : { ...d, currentPercent: d.targetPercent }
      ),
    }));
  };

  const handleRunAudit = async () => {
    setIsAnalyzing(true);
    setAuditError(null);

    const auditEl = document.getElementById('audit');
    if (auditEl) {
      auditEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      const result = await postJson<AiAuditResult>('/api/advisor/analyze', { profile });
      setAuditResult(result);

      // Update each department's AI targetPercent from the Gemini recommendation
      const recMap = new Map(
        result.recommendedAllocations.map((r) => [r.departmentId, r.targetPercent])
      );
      setProfile((prev) => ({
        ...prev,
        departments: prev.departments.map((d) => ({
          ...d,
          targetPercent: recMap.has(d.id) ? recMap.get(d.id)! : d.targetPercent,
        })),
      }));
    } catch (err) {
      setAuditError(
        err instanceof Error ? err.message : 'Unable to reach AI advisor service.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleJumpToScenarios = () => {
    const el = document.getElementById('scenarios');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleApplyScenario = (scenario: ScenarioResult) => {
    setProfile((prev) => {
      const adjMap = new Map(
        scenario.departmentAdjustments.map((a) => [
          a.departmentName.trim().toLowerCase(),
          a.recommendedAdjustmentPercent,
        ])
      );

      const updated = prev.departments.map((d) => {
        if (d.locked) return d;
        const delta = adjMap.get(d.name.trim().toLowerCase());
        if (delta === undefined || !Number.isFinite(delta)) return d;
        const nextPct = Math.max(0, Math.min(100, Math.round((d.currentPercent + delta) * 10) / 10));
        return { ...d, currentPercent: nextPct };
      });

      return { ...prev, departments: updated };
    });

    const el = document.getElementById('allocations');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-zinc-100 flex flex-col">
      <TopBar isAnalyzing={isAnalyzing} onRunAudit={handleRunAudit} />

      <main className="flex-1">
        <HeroSplit
          profile={profile}
          presets={BUSINESS_PRESETS}
          auditResult={auditResult}
          isAnalyzing={isAnalyzing}
          onSelectPreset={handleSelectPreset}
          onRunAudit={handleRunAudit}
          onJumpToScenarios={handleJumpToScenarios}
        />

        <AllocationWorkspace
          profile={profile}
          auditResult={auditResult}
          isAnalyzing={isAnalyzing}
          onUpdateProfile={setProfile}
          onRunAudit={handleRunAudit}
          onResetPreset={handleResetPreset}
        />

        <AiAuditPanel
          profile={profile}
          auditResult={auditResult}
          isAnalyzing={isAnalyzing}
          error={auditError}
          onRunAudit={handleRunAudit}
          onApplyAllTargets={handleApplyAllTargets}
        />

        <ScenarioAdvisorSection
          profile={profile}
          onApplyScenario={handleApplyScenario}
        />
      </main>

      <footer className="border-t border-white/10 bg-[#0B0B0D]">
        <div className="mx-auto flex max-w-[1440px] flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6 lg:px-14 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-zinc-300">Strata</span>
            <span aria-hidden="true">·</span>
            <span>Business Budget Allocation &amp; Treasury Planning</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#overview" className="hover:text-zinc-300 transition-colors">
              Overview
            </a>
            <a href="#allocations" className="hover:text-zinc-300 transition-colors">
              Allocations
            </a>
            <a href="#audit" className="hover:text-zinc-300 transition-colors">
              AI Audit
            </a>
            <a href="#scenarios" className="hover:text-zinc-300 transition-colors">
              Scenarios
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
