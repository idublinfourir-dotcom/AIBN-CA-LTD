"use client";

/* Ireland Corporation Tax calculator: trading (12.5%) and passive (25%). The
   user classifies which income is which; this component never guesses. The
   editable rates arrive as `config` (admin-editable, DB-backed with a code
   fallback); the maths + statute notes live in ../lib/ireland-corporation-tax
   and this computes live via that pure engine. */

import { useMemo, useState } from "react";
import {
  computeCorporationTax,
  CT_LAST_REVIEWED,
  CT_SOURCE_URL,
  PILLAR_TWO,
  type CtConfig,
} from "../lib/ireland-corporation-tax";
import {
  CurrencyField,
  LegendDot,
  ProportionBar,
  ResultDisclaimer,
} from "./calculator-fields";

const money = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const pct2 = (fraction: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fraction);

/* One breakdown line: colour swatch · label + derivation (base × rate) · tax. */
function BreakdownRow({
  dotClass,
  label,
  sub,
  value,
}: {
  dotClass: string;
  label: string;
  sub: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6">
      <div className="flex items-baseline gap-2.5">
        <LegendDot className={dotClass} />
        <div>
          <span className="text-sm text-ink-body">{label}</span>
          <span className="mt-0.5 block text-xs text-muted tabular-nums">{sub}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}

export function IrelandCorporationTaxCalculator({ config }: { config: CtConfig }) {
  const [tradingProfit, setTradingProfit] = useState(0);
  const [passiveIncome, setPassiveIncome] = useState(0);

  const result = useMemo(
    () => computeCorporationTax({ tradingProfit, passiveIncome }, config),
    [tradingProfit, passiveIncome, config],
  );

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* inputs */}
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-primary-500 bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
          <span className="font-semibold text-ink">You decide the split.</span>{" "}
          Trading income is active business profit (12.5%); passive income is
          rent, interest and most foreign dividends (25%). Enter each figure
          where it belongs: the tool never classifies for you.
        </div>

        <CurrencyField
          label="Trading profit"
          value={tradingProfit}
          onChange={setTradingProfit}
          hint="Active business trading profits: taxed at 12.5%."
        />
        <CurrencyField
          label="Passive / non-trading income"
          value={passiveIncome}
          onChange={setPassiveIncome}
          hint="Rental income, interest and most foreign dividends: taxed at 25%."
        />

        <div className="mt-auto border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Not included
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            Trading and passive income only. Chargeable gains on disposals, the
            Knowledge Development Box (10% effective), the close-company surcharge
            and start-up relief can each change the final bill: that&rsquo;s a
            conversation, not a slider. For the R&amp;D credit (35%), use the{" "}
            <a
              href="/tools/ireland-rd-tax-credit"
              className="font-medium text-primary-500 underline-offset-2 hover:underline"
            >
              R&amp;D credit calculator
            </a>
            .
          </p>
        </div>
      </div>

      {/* results */}
      <div className="flex flex-col">
        <div className="border border-line bg-surface">
          {/* hero: total tax + blended rate + split bar */}
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Corporation tax
              </p>
              <span className="text-xs text-muted tabular-nums">
                on {money(result.totalProfit)} taxable income
              </span>
            </div>
            <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {money(result.totalTax)}
            </p>
            <p className="mt-2.5 text-sm text-muted">
              Total corporation tax ·{" "}
              <span className="font-semibold text-primary-600 tabular-nums">
                {pct2(result.effectiveRate)}
              </span>{" "}
              blended effective rate
            </p>
            <div className="mt-4">
              <ProportionBar
                segments={[
                  {
                    label: `Trading tax ${money(result.tradingTax)}`,
                    value: result.tradingTax,
                    className: "bg-primary-500",
                  },
                  {
                    label: `Passive tax ${money(result.passiveTax)}`,
                    value: result.passiveTax,
                    className: "bg-navy-900",
                  },
                ]}
              />
            </div>
          </div>

          {/* breakdown */}
          <dl className="divide-y divide-line">
            <BreakdownRow
              dotClass="bg-primary-500"
              label="Trading tax"
              sub={`${money(result.tradingProfit)} × ${config.tradingPercent}%`}
              value={money(result.tradingTax)}
            />
            <BreakdownRow
              dotClass="bg-navy-900"
              label="Passive tax"
              sub={`${money(result.passiveIncome)} × ${config.passivePercent}%`}
              value={money(result.passiveTax)}
            />
            <div className="flex items-baseline justify-between gap-4 bg-surface-muted px-5 py-3.5 sm:px-6">
              <span className="text-sm font-semibold text-ink">
                Total corporation tax
              </span>
              <span className="font-display text-sm font-semibold text-ink tabular-nums">
                {money(result.totalTax)}
              </span>
            </div>
          </dl>
        </div>

        {/* Pillar Two: info note, never a live input (read from config) */}
        <div className="mt-5 border border-line bg-surface p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Large groups: Pillar Two
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted">{PILLAR_TWO.note}</p>
        </div>

        <ResultDisclaimer asOf={CT_LAST_REVIEWED} sourceUrl={CT_SOURCE_URL} />
      </div>
    </div>
  );
}
