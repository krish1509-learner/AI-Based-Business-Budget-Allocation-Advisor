import React, { useState } from 'react';
import type { MonthlyRunwayPoint } from '../types/budget';

interface RunwayChartProps {
  data: MonthlyRunwayPoint[];
}

export const RunwayChart: React.FC<RunwayChartProps> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return null;
  }

  const width = 640;
  const height = 220;
  const padX = 48;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const allValues = data.flatMap((d) => [d.baselineCash, d.optimizedCash]);
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const getX = (idx: number) => padX + (idx / Math.max(1, data.length - 1)) * innerW;
  const getY = (val: number) => padY + innerH - ((val - minVal) / range) * innerH;

  const baselinePath = data
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(pt.baselineCash).toFixed(1)}`)
    .join(' ');

  const optimizedPath = data
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(pt.optimizedCash).toFixed(1)}`)
    .join(' ');

  const optimizedArea = `${optimizedPath} L ${getX(data.length - 1).toFixed(1)} ${(padY + innerH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const formatMoney = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
    return `$${Math.round(v)}`;
  };

  const activePoint = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2 text-zinc-200">
            <span className="inline-block h-0.5 w-4 bg-white" aria-hidden="true" />
            <span>AI-Rebalanced Cash</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-zinc-500" aria-hidden="true" />
            <span>Baseline Burn</span>
          </div>
        </div>

        <div className="text-xs font-mono tabular-nums text-zinc-300">
          {activePoint.month}:{' '}
          <span className="text-white font-semibold">{formatMoney(activePoint.optimizedCash)}</span>
          <span className="text-zinc-500 mx-1.5">/</span>
          <span className="text-zinc-400">Base {formatMoney(activePoint.baselineCash)}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="12-month cash runway comparison chart"
      >
        <defs>
          <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((t) => {
          const y = padY + innerH - t * innerH;
          const val = minVal + t * range;
          return (
            <g key={t}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
              />
              <text
                x={padX - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-500 text-[10px] font-mono tabular-nums"
              >
                {formatMoney(val)}
              </text>
            </g>
          );
        })}

        <path d={optimizedArea} fill="url(#optimizedGrad)" />

        <path
          d={baselinePath}
          fill="none"
          stroke="#71717A"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        <path
          d={optimizedPath}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((pt, idx) => {
          const x = getX(idx);
          const yOpt = getY(pt.optimizedCash);
          const isHovered = hoverIdx === idx;
          return (
            <g key={pt.month}>
              {idx % 2 === 0 || idx === data.length - 1 ? (
                <text
                  x={x}
                  y={height - 4}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[10px] font-mono"
                >
                  {pt.month}
                </text>
              ) : null}

              <circle
                cx={x}
                cy={yOpt}
                r={isHovered ? 4.5 : 2.5}
                className="fill-white transition-all duration-150"
              />

              <rect
                x={x - innerW / (data.length * 2)}
                y={padY}
                width={innerW / data.length}
                height={innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
