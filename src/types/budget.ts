export type StrategicObjective =
  | 'Balanced Growth'
  | 'Profitability & Margin'
  | 'Aggressive Expansion'
  | 'R&D Innovation';

export type CompanyStage =
  | 'Seed / Early'
  | 'Series A / B'
  | 'Growth Equity'
  | 'Enterprise / Mature';

export interface DepartmentAllocation {
  id: string;
  name: string;
  category: 'R&D' | 'Growth' | 'Operations' | 'G&A' | 'Reserve';
  currentPercent: number;
  targetPercent: number;
  locked: boolean;
  monthlyBurnNote: string;
}

export interface BusinessProfile {
  id: string;
  companyName: string;
  industry: string;
  stage: CompanyStage;
  objective: StrategicObjective;
  annualBudget: number;
  monthlyRevenue: number;
  cashReserves: number;
  headcount: number;
  departments: DepartmentAllocation[];
}

export interface RecommendedAllocationItem {
  departmentId: string;
  departmentName: string;
  targetPercent: number;
  rationale: string;
  expectedRoiImpact: string;
  priority: 'Increase' | 'Hold' | 'Trim';
}

export interface RebalanceAction {
  fromDepartment: string;
  toDepartment: string;
  amount: number;
  percentShift: number;
  impactSummary: string;
}

export interface MonthlyRunwayPoint {
  month: string;
  baselineCash: number;
  optimizedCash: number;
}

export interface AiAuditResult {
  executiveSummary: string;
  projectedRunwayMonths: number;
  baselineRunwayMonths: number;
  annualEfficiencyGain: number;
  recommendedAllocations: RecommendedAllocationItem[];
  rebalanceActions: RebalanceAction[];
  runwayProjection: MonthlyRunwayPoint[];
  keyRisks: string[];
  generatedAt: string;
}

export interface ScenarioImpactItem {
  departmentName: string;
  recommendedAdjustmentPercent: number;
  dollarDelta: number;
  actionNote: string;
}

export interface ScenarioResult {
  scenarioTitle: string;
  severityLevel: 'Low' | 'Moderate' | 'High';
  summary: string;
  revisedRunwayMonths: number;
  revenueImpactPercent: number;
  recommendedReservePercent: number;
  departmentAdjustments: ScenarioImpactItem[];
  immediatePlaybook: string[];
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'advisor';
  content: string;
  timestamp: string;
}
