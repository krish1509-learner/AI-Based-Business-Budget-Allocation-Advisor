import React from 'react';

interface TopBarProps {
  isAnalyzing: boolean;
  onRunAudit: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isAnalyzing, onRunAudit }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0E0E10]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-4 lg:px-10">
        {/* Zone 1: Single-element brand wordmark */}
        <a
          href="#overview"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="text-white"
          >
            <path d="M2 3H18L10 17L2 3Z" fill="currentColor" />
          </svg>
          <span className="font-display">Strata</span>
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
          <a
            href="#overview"
            className="hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Overview
          </a>
          <a
            href="#allocations"
            className="hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Allocations
          </a>
          <a
            href="#audit"
            className="hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            AI Audit
          </a>
          <a
            href="#scenarios"
            className="hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Scenarios
          </a>
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onRunAudit}
            disabled={isAnalyzing}
            className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors duration-150 hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {isAnalyzing ? 'Analyzing Budget...' : 'Run AI Audit'}
          </button>
        </div>
      </div>
    </header>
  );
};
