"use client";

/* Working Capital calculator (finance): current assets − current liabilities,
   plus the current and quick (acid-test) ratios. Standard financial-analysis
   metrics, not tax. All maths live in ../lib/working-capital (single source of
   truth). */

import { useMemo, useState } from "react";
import {
  computeWorkingCapital,
  type WorkingCapitalResult,
} from "../lib/working-capital";
import { CurrencyField, LegendDot, ProportionBar } from "./calculator-fields";

const money = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const ratio = (n: number) => `${n.toFixed(2)}×`;

/* Rule-of-thumb reading of a ratio: deliberately hedged. */
function currentRatioBand(r: number | null): string {
  if (r === null) return "No current liabilities to cover.";
  if (r < 1) return "Under 1: current liabilities exceed current assets.";
  if (r < 1.5) return "1–1.5: adequate, but tight.";
  if (r <= 3) return "1.5–3: generally considered healthy.";
  return "Over 3: comfortable, but may signal idle cash or stock.";
}

function quickRatioBand(r: number | null): string {
  if (r === null) return "No current liabilities to cover.";
  if (r < 1) return "Under 1: can't cover liabilities without selling stock.";
  return "1 or above: liabilities covered from liquid assets alone.";
}

function RatioCard({
  title,
  value,
  formula,
  reading,
}: {
  title: string;
  value: string;
  formula: string;
  reading: string;
}) {
  return (
    <div className="border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {title}
        </h3>
        <span className="font-display text-lg font-semibold text-ink tabular-nums">
          {value}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted tabular-nums">{formula}</p>
      <p className="mt-2 text-xs leading-5 text-ink-body">{reading}</p>
    </div>
  );
}

function ResultCard({ r }: { r: WorkingCapitalResult }) {
  const view = {
    surplus: {
      tag: { text: "Surplus", cls: "bg-primary-500 text-white" },
      sub: "current assets exceed current liabilities, so short-term obligations are covered.",
    },
    deficit: {
      tag: { text: "Deficit", cls: "bg-navy-900 text-white" },
      sub: "current liabilities exceed current assets, leaving a short-term funding gap.",
    },
    balanced: {
      tag: { text: "Balanced", cls: "border border-line bg-surface-muted text-muted" },
      sub: "current assets exactly match current liabilities.",
    },
  }[r.direction];

  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Working capital
          </p>
          <span
            className={`rounded-none px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${view.tag.cls}`}
          >
            {view.tag.text}
          </span>
        </div>
        <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
          {money(Math.abs(r.workingCapital))}
        </p>
        <p className="mt-2.5 text-sm text-muted">{view.sub}</p>
        <div className="mt-4">
          <ProportionBar
            segments={[
              {
                label: `Current assets ${money(r.currentAssets)}`,
                value: r.currentAssets,
                className: "bg-primary-500",
              },
              {
                label: `Current liabilities ${money(r.currentLiabilities)}`,
                value: r.currentLiabilities,
                className: "bg-navy-900",
              },
            ]}
          />
        </div>
      </div>
      <dl className="divide-y divide-line">
        <div className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <LegendDot className="bg-primary-500" />
            <span className="text-sm text-ink-body">Current assets</span>
          </div>
          <span className="text-sm font-medium text-ink tabular-nums">
            {money(r.currentAssets)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <LegendDot className="bg-navy-900" />
            <span className="text-sm text-ink-body">Current liabilities</span>
          </div>
          <span className="text-sm font-medium text-ink tabular-nums">
            {money(r.currentLiabilities)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 bg-surface-muted px-5 py-3.5 sm:px-6">
          <span className="text-sm font-semibold text-ink">
            Working capital (assets − liabilities)
          </span>
          <span className="font-display text-sm font-semibold text-ink tabular-nums">
            {money(r.workingCapital)}
          </span>
        </div>
      </dl>
    </div>
  );
}

export function WorkingCapitalCalculator() {
  const [currentAssets, setCurrentAssets] = useState(0);
  const [currentLiabilities, setCurrentLiabilities] = useState(0);
  const [inventory, setInventory] = useState(0);

  const r = useMemo(
    () => computeWorkingCapital({ currentAssets, currentLiabilities, inventory }),
    [currentAssets, currentLiabilities, inventory],
  );

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* inputs */}
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-primary-500 bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
          <span className="font-semibold text-ink">Liquidity, not tax.</span> Working
          capital is what&rsquo;s left of your short-term assets after short-term
          debts: the buffer that funds day-to-day trading. Enter the balance-sheet
          figures and the ratios are worked out for you.
        </div>

        <CurrencyField
          label="Current assets"
          value={currentAssets}
          onChange={setCurrentAssets}
          hint="Cash, trade receivables (debtors), stock and other assets due within 12 months."
        />
        <CurrencyField
          label="Current liabilities"
          value={currentLiabilities}
          onChange={setCurrentLiabilities}
          hint="Trade payables (creditors), tax, overdraft and other debts due within 12 months."
        />
        <CurrencyField
          label="Inventory / stock (optional)"
          value={inventory}
          onChange={setInventory}
          hint="Part of current assets. Entering it gives the quick (acid-test) ratio, which strips out stock."
        />

        <div className="mt-auto border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            A snapshot, not the whole story
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            Working capital is a point-in-time figure. Read it alongside cash flow,
            seasonality and the cash-conversion cycle: what&rsquo;s &ldquo;healthy&rdquo;
            varies a lot by industry.
          </p>
        </div>
      </div>

      {/* results */}
      <div className="flex flex-col gap-5">
        <ResultCard r={r} />
        <div className="grid gap-5 sm:grid-cols-2">
          <RatioCard
            title="Current ratio"
            value={r.currentRatio === null ? "n/a" : ratio(r.currentRatio)}
            formula="assets ÷ liabilities"
            reading={currentRatioBand(r.currentRatio)}
          />
          <RatioCard
            title="Quick ratio"
            value={r.quickRatio === null ? "n/a" : ratio(r.quickRatio)}
            formula="(assets − stock) ÷ liabilities"
            reading={quickRatioBand(r.quickRatio)}
          />
        </div>
        <p className="border-t border-line pt-6 text-xs leading-5 text-muted">
          Indicative only, not financial advice. Ratio &ldquo;health&rdquo; is a rule
          of thumb that varies by industry and season: read these figures alongside
          cash flow and your specific circumstances.
        </p>
      </div>
    </div>
  );
}
