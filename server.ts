import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-3.5-flash';

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface DeptInput {
  id: string;
  name: string;
  category: string;
  currentPercent: number;
  targetPercent: number;
  locked: boolean;
  monthlyBurnNote?: string;
}

interface ProfileInput {
  companyName: string;
  industry: string;
  stage: string;
  objective: string;
  annualBudget: number;
  monthlyRevenue: number;
  cashReserves: number;
  headcount: number;
  departments: DeptInput[];
}

function validateProfile(body: unknown): { valid: true; data: ProfileInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request payload.' };
  }
  const p = body as Record<string, unknown>;
  if (typeof p.companyName !== 'string' || !p.companyName.trim() || p.companyName.length > 120) {
    return { valid: false, error: 'Company name must be a non-empty string under 120 characters.' };
  }
  if (typeof p.industry !== 'string' || !p.industry.trim() || p.industry.length > 120) {
    return { valid: false, error: 'Industry must be specified.' };
  }
  if (typeof p.stage !== 'string' || typeof p.objective !== 'string') {
    return { valid: false, error: 'Company stage and strategic objective are required.' };
  }
  const annualBudget = Number(p.annualBudget);
  const monthlyRevenue = Number(p.monthlyRevenue);
  const cashReserves = Number(p.cashReserves);
  const headcount = Number(p.headcount);

  if (!Number.isFinite(annualBudget) || annualBudget <= 0 || annualBudget > 10_000_000_000) {
    return { valid: false, error: 'Annual budget must be a positive number.' };
  }
  if (!Number.isFinite(monthlyRevenue) || monthlyRevenue < 0 || monthlyRevenue > 1_000_000_000) {
    return { valid: false, error: 'Monthly revenue must be zero or positive.' };
  }
  if (!Number.isFinite(cashReserves) || cashReserves < 0 || cashReserves > 10_000_000_000) {
    return { valid: false, error: 'Cash reserves must be zero or positive.' };
  }
  if (!Number.isFinite(headcount) || headcount < 1 || headcount > 1_000_000) {
    return { valid: false, error: 'Headcount must be at least 1.' };
  }
  if (!Array.isArray(p.departments) || p.departments.length < 2 || p.departments.length > 15) {
    return { valid: false, error: 'Between 2 and 15 departments are required.' };
  }

  const departments: DeptInput[] = [];
  for (const raw of p.departments) {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, error: 'Invalid department entry.' };
    }
    const d = raw as Record<string, unknown>;
    const currentPercent = Number(d.currentPercent);
    const targetPercent = Number(d.targetPercent);
    if (
      typeof d.id !== 'string' ||
      typeof d.name !== 'string' ||
      !d.name.trim() ||
      d.name.length > 80 ||
      !Number.isFinite(currentPercent) ||
      currentPercent < 0 ||
      currentPercent > 100
    ) {
      return { valid: false, error: 'Each department requires a valid name and percentage between 0 and 100.' };
    }
    departments.push({
      id: d.id,
      name: d.name.trim(),
      category: typeof d.category === 'string' ? d.category : 'Operations',
      currentPercent,
      targetPercent: Number.isFinite(targetPercent) ? targetPercent : currentPercent,
      locked: Boolean(d.locked),
      monthlyBurnNote: typeof d.monthlyBurnNote === 'string' ? d.monthlyBurnNote.slice(0, 160) : '',
    });
  }

  return {
    valid: true,
    data: {
      companyName: p.companyName.trim(),
      industry: p.industry.trim(),
      stage: p.stage,
      objective: p.objective,
      annualBudget,
      monthlyRevenue,
      cashReserves,
      headcount,
      departments,
    },
  };
}

function parseJsonSafely<T>(rawText: string): T {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : '';
      const isNonRetryable =
        msg === 'MISSING_GEMINI_API_KEY' ||
        msg.includes('400') ||
        msg.includes('403') ||
        msg.includes('404') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('API_KEY_INVALID') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED');
      if (isNonRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

function handleGeminiError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  if (message === 'MISSING_GEMINI_API_KEY') {
    res.status(500).json({
      error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
    res.status(403).json({
      error: 'Gemini API authentication failed. Please check your GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    res.status(429).json({
      error: 'AI advisor rate limit reached. Please wait a moment and try again.',
    });
    return;
  }
  console.error('Gemini API Error:', err);
  res.status(502).json({
    error: 'Unable to complete AI analysis right now. Please try again shortly.',
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/advisor/analyze', async (req: Request, res: Response) => {
    const validation = validateProfile(req.body?.profile);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const profile = validation.data;
    const monthlySpend = profile.annualBudget / 12;
    const netMonthlyBurn = Math.max(0, monthlySpend - profile.monthlyRevenue);
    const baselineRunway = netMonthlyBurn > 0 ? Number((profile.cashReserves / netMonthlyBurn).toFixed(1)) : 60;

    try {
      const ai = getGenAIClient();
      const lockedDepts = profile.departments.filter((d) => d.locked);
      const lockedTotal = lockedDepts.reduce((sum, d) => sum + d.currentPercent, 0);

      const prompt = `Analyze this business budget and propose an optimal allocation.

Business Profile:
- Company: ${profile.companyName}
- Industry: ${profile.industry}
- Stage: ${profile.stage}
- Primary Objective: ${profile.objective}
- Annual Operating Budget: $${profile.annualBudget.toLocaleString('en-US')} ($${Math.round(monthlySpend).toLocaleString('en-US')}/mo)
- Monthly Revenue: $${profile.monthlyRevenue.toLocaleString('en-US')}/mo
- Cash Reserves: $${profile.cashReserves.toLocaleString('en-US')}
- Headcount: ${profile.headcount}
- Current Baseline Runway: ${baselineRunway} months

Departments (NOTE: locked=true MUST keep exact currentPercent; unlocked departments must absorb changes so the sum of ALL targetPercent equals exactly 100):
${profile.departments
  .map(
    (d) =>
      `- id="${d.id}" | name="${d.name}" | category="${d.category}" | currentPercent=${d.currentPercent}% ($${Math.round(
        (profile.annualBudget * d.currentPercent) / 100
      ).toLocaleString('en-US')}) | locked=${d.locked} | note="${d.monthlyBurnNote ?? ''}"`
  )
  .join('\n')}

Locked sum is ${lockedTotal}%. Unlocked departments must sum to ${(100 - lockedTotal).toFixed(1)}%.
Provide:
1. A crisp executiveSummary (2-3 concrete sentences tailored to their stage and objective).
2. recommendedAllocations for EVERY department id listed above, ensuring targetPercent values sum to 100 and locked departments preserve their exact currentPercent.
3. Concrete rebalanceActions showing dollar shifts from trimmed departments to increased departments.
4. A 12-month cash trajectory (runwayProjection) comparing baselineCash vs optimizedCash starting from Month 1 to Month 12.
5. 2-3 specific keyRisks.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are a pragmatic Chief Financial Officer and institutional capital allocation advisor. Ground all recommendations strictly in the company financial figures provided. Never invent fake product names or generic filler. Ensure all recommended targetPercent values sum cleanly to 100.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                projectedRunwayMonths: { type: Type.NUMBER },
                baselineRunwayMonths: { type: Type.NUMBER },
                annualEfficiencyGain: { type: Type.NUMBER },
                recommendedAllocations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      departmentId: { type: Type.STRING },
                      departmentName: { type: Type.STRING },
                      targetPercent: { type: Type.NUMBER },
                      rationale: { type: Type.STRING },
                      expectedRoiImpact: { type: Type.STRING },
                      priority: { type: Type.STRING },
                    },
                    required: [
                      'departmentId',
                      'departmentName',
                      'targetPercent',
                      'rationale',
                      'expectedRoiImpact',
                      'priority',
                    ],
                  },
                },
                rebalanceActions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      fromDepartment: { type: Type.STRING },
                      toDepartment: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      percentShift: { type: Type.NUMBER },
                      impactSummary: { type: Type.STRING },
                    },
                    required: ['fromDepartment', 'toDepartment', 'amount', 'percentShift', 'impactSummary'],
                  },
                },
                runwayProjection: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      month: { type: Type.STRING },
                      baselineCash: { type: Type.NUMBER },
                      optimizedCash: { type: Type.NUMBER },
                    },
                    required: ['month', 'baselineCash', 'optimizedCash'],
                  },
                },
                keyRisks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'executiveSummary',
                'projectedRunwayMonths',
                'baselineRunwayMonths',
                'annualEfficiencyGain',
                'recommendedAllocations',
                'rebalanceActions',
                'runwayProjection',
                'keyRisks',
              ],
            },
          },
        })
      );

      const rawText = response.text ?? '';
      const parsed = parseJsonSafely<Record<string, unknown>>(rawText);

      // Normalize target percentages to guarantee locked depts stay locked and sum equals 100
      const recMap = new Map<string, Record<string, unknown>>();
      if (Array.isArray(parsed.recommendedAllocations)) {
        for (const item of parsed.recommendedAllocations) {
          if (item && typeof item.departmentId === 'string') {
            recMap.set(item.departmentId, item);
          }
        }
      }

      const normalizedRecs = profile.departments.map((dept) => {
        const aiItem = recMap.get(dept.id);
        const rawPct = aiItem && Number.isFinite(Number(aiItem.targetPercent)) ? Number(aiItem.targetPercent) : dept.currentPercent;
        const clamped = dept.locked ? dept.currentPercent : Math.max(0, Math.min(100, Math.round(rawPct * 10) / 10));
        return {
          departmentId: dept.id,
          departmentName: dept.name,
          targetPercent: clamped,
          rationale: typeof aiItem?.rationale === 'string' ? aiItem.rationale : 'Maintain aligned with current operating plan.',
          expectedRoiImpact: typeof aiItem?.expectedRoiImpact === 'string' ? aiItem.expectedRoiImpact : 'Neutral capital impact',
          priority:
            aiItem?.priority === 'Increase' || aiItem?.priority === 'Trim' || aiItem?.priority === 'Hold'
              ? aiItem.priority
              : clamped > dept.currentPercent
                ? 'Increase'
                : clamped < dept.currentPercent
                  ? 'Trim'
                  : 'Hold',
        };
      });

      // Adjust largest unlocked department slightly if rounding caused != 100
      const totalAssigned = normalizedRecs.reduce((acc, r) => acc + r.targetPercent, 0);
      const diff = Math.round((100 - totalAssigned) * 10) / 10;
      if (Math.abs(diff) > 0.01) {
        const unlockedIdx = normalizedRecs.findIndex((r, i) => !profile.departments[i].locked && r.targetPercent + diff >= 0);
        if (unlockedIdx >= 0) {
          normalizedRecs[unlockedIdx].targetPercent = Math.round((normalizedRecs[unlockedIdx].targetPercent + diff) * 10) / 10;
        }
      }

      res.json({
        ...parsed,
        baselineRunwayMonths: baselineRunway,
        recommendedAllocations: normalizedRecs,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleGeminiError(err, res);
    }
  });

  app.post('/api/advisor/scenario', async (req: Request, res: Response) => {
    const validation = validateProfile(req.body?.profile);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }
    const scenarioPrompt = typeof req.body?.scenario === 'string' ? req.body.scenario.trim() : '';
    if (!scenarioPrompt || scenarioPrompt.length > 500) {
      res.status(400).json({ error: 'Scenario description must be between 1 and 500 characters.' });
      return;
    }

    const profile = validation.data;

    try {
      const ai = getGenAIClient();
      const prompt = `Stress-test this business budget under the following scenario: "${scenarioPrompt}"

Company: ${profile.companyName} (${profile.industry}, ${profile.stage})
Objective: ${profile.objective}
Annual Budget: $${profile.annualBudget.toLocaleString('en-US')}
Monthly Revenue: $${profile.monthlyRevenue.toLocaleString('en-US')}
Cash Reserves: $${profile.cashReserves.toLocaleString('en-US')}
Departments:
${profile.departments.map((d) => `- ${d.name}: ${d.currentPercent}% ($${Math.round((profile.annualBudget * d.currentPercent) / 100).toLocaleString('en-US')})`).join('\n')}

Return a concise, CFO-grade impact assessment with department-level percentage adjustments, dollar deltas, revised runway months, and an immediate 3-step playbook.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are a corporate FP&A stress-testing advisor. Provide realistic, quantifiable scenario modeling grounded strictly in the input budget.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scenarioTitle: { type: Type.STRING },
                severityLevel: { type: Type.STRING },
                summary: { type: Type.STRING },
                revisedRunwayMonths: { type: Type.NUMBER },
                revenueImpactPercent: { type: Type.NUMBER },
                recommendedReservePercent: { type: Type.NUMBER },
                departmentAdjustments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      departmentName: { type: Type.STRING },
                      recommendedAdjustmentPercent: { type: Type.NUMBER },
                      dollarDelta: { type: Type.NUMBER },
                      actionNote: { type: Type.STRING },
                    },
                    required: ['departmentName', 'recommendedAdjustmentPercent', 'dollarDelta', 'actionNote'],
                  },
                },
                immediatePlaybook: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'scenarioTitle',
                'severityLevel',
                'summary',
                'revisedRunwayMonths',
                'revenueImpactPercent',
                'recommendedReservePercent',
                'departmentAdjustments',
                'immediatePlaybook',
              ],
            },
          },
        })
      );

      const parsed = parseJsonSafely<Record<string, unknown>>(response.text ?? '');
      res.json(parsed);
    } catch (err) {
      handleGeminiError(err, res);
    }
  });

  app.post('/api/advisor/chat', async (req: Request, res: Response) => {
    const validation = validateProfile(req.body?.profile);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question || question.length > 1000) {
      res.status(400).json({ error: 'Question must be between 1 and 1000 characters.' });
      return;
    }

    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
    const profile = validation.data;

    try {
      const ai = getGenAIClient();
      const contextSummary = `Company: ${profile.companyName} (${profile.industry}, ${profile.stage})
Objective: ${profile.objective}
Annual Budget: $${profile.annualBudget.toLocaleString('en-US')}
Monthly Revenue: $${profile.monthlyRevenue.toLocaleString('en-US')}
Cash Reserves: $${profile.cashReserves.toLocaleString('en-US')}
Headcount: ${profile.headcount}
Current Allocations:
${profile.departments
  .map(
    (d) =>
      `- ${d.name}: ${d.currentPercent}% ($${Math.round((profile.annualBudget * d.currentPercent) / 100).toLocaleString('en-US')}) [Target: ${d.targetPercent}%, Locked: ${d.locked}]`
  )
  .join('\n')}`;

      const validHistory: Array<{ role: string; content: string }> = history.filter(
        (h: unknown): h is { role: string; content: string } =>
          Boolean(h && typeof h === 'object' && typeof (h as { content?: unknown }).content === 'string')
      );
      const historyText = validHistory
        .map((h: { role: string; content: string }) => `${h.role === 'user' ? 'Executive' : 'Advisor'}: ${h.content.slice(0, 600)}`)
        .join('\n');

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Executive question: ${question}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: `You are Strata AI, an institutional CFO & Budget Allocation Advisor. Answer concisely in plain, decisive prose with exact dollar and percentage trade-offs grounded in this company's live budget:\n\n${contextSummary}\n\nKeep responses under 160 words unless asked for a detailed breakdown. Use clean formatting without markdown code blocks.`,
          },
        })
      );

      res.json({
        reply: (response.text ?? 'No recommendation generated.').trim(),
      });
    } catch (err) {
      handleGeminiError(err, res);
    }
  });

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      const msg = err instanceof Error ? err.message : 'Invalid API request.';
      res.status(400).json({ error: msg });
      return;
    }
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Strata server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
