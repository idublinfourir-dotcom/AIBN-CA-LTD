"use client";

/* Ireland Capital Allowances calculator: wear & tear / writing-down allowances
   on plant & machinery (12.5%/8yr), cars (12.5%/8yr, €24k cap + CO2 restriction),
   industrial buildings (4%/25yr) and energy-efficient equipment (100% ACA).
   The user picks the asset class; this component never guesses. The editable
   rates/limits arrive as `config` (admin-editable, DB-backed with a code
   fallback); the maths + the statutory CO2 groups live in
   ../lib/ireland-capital-allowances. */

import { useMemo, useState } from "react";
import {
  computeCapitalAllowance,
  CAR_CO2_GROUPS,
  CAR_2027_NOTE,
  CA_LAST_REVIEWED,
  CA_SOURCE_URL,
  type AssetKey,
  type CaConfig,
  type Co2GroupKey,
} from "../lib/ireland-capital-allowances";
import {
  CurrencyField,
  LegendDot,
  ResultDisclaimer,
  SelectField,
} from "./calculator-fields";

const money = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const eur0 = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/* One breakdown line: label + optional derivation · value. */
function Row({
  dotClass,
  label,
  sub,
  value,
  strong,
}: {
  dotClass?: string;
  label: string;
  sub?: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6 ${
        strong ? "bg-surface-muted" : ""
      }`}
    >
      <div className="flex items-baseline gap-2.5">
        {dotClass && <LegendDot className={dotClass} />}
        <div>
          <span className={`text-sm ${strong ? "font-semibold text-ink" : "text-ink-body"}`}>
            {label}
          </span>
          {sub && <span className="mt-0.5 block text-xs text-muted tabular-nums">{sub}</span>}
        </div>
      </div>
      <span
        className={`tabular-nums ${
          strong
            ? "font-display text-sm font-semibold text-ink"
            : "text-sm font-medium text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function IrelandCapitalAllowancesCalculator({ config }: { config: CaConfig }) {
  const [assetKey, setAssetKey] = useState<AssetKey>("plant-machinery");
  const [cost, setCost] = useState(0);
  const [co2Group, setCo2Group] = useState<Co2GroupKey>("group1");

  // Resolve from the (possibly edited) config, not the module const.
  const cls = config.classes.find((a) => a.key === assetKey) ?? config.classes[0];
  const isCar = cls.co2Restricted === true;

  const r = useMemo(
    () => computeCapitalAllowance({ assetKey, cost, co2Group }, config),
    [assetKey, cost, co2Group, config],
  );

  const heroLabel = r.firstYearFull ? "First-year allowance" : "Annual allowance";
  const heroValue = r.firstYearFull ? r.firstYearAllowance : r.annualAllowance;
  const heroSub = r.firstYearFull
    ? "100% written off in year one"
    : `${r.ratePercent}% a year for ${r.years} years`;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* inputs */}
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-primary-500 bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
          <span className="font-semibold text-ink">Tax depreciation.</span> Capital
          allowances write the cost of a qualifying asset off against taxable profits
          over a set life. Pick the asset and the rate, period and any cap are applied
          for you.
        </div>

        <SelectField
          label="Asset type"
          value={assetKey}
          onChange={(v) => setAssetKey(v as AssetKey)}
          hint={cls.note}
        >
          {config.classes.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </SelectField>

        {isCar && (
          <SelectField
            label="Car CO₂ emissions"
            value={co2Group}
            onChange={(v) => setCo2Group(v as Co2GroupKey)}
            hint={
              <>
                {CAR_CO2_GROUPS.find((g) => g.key === co2Group)?.note}
                <span className="mt-1 block">{CAR_2027_NOTE}</span>
              </>
            }
          >
            {CAR_CO2_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </SelectField>
        )}

        <CurrencyField
          label={isCar ? "Cost of the car" : "Cost of the asset"}
          value={cost}
          onChange={setCost}
          hint={
            isCar
              ? `Full purchase cost. Allowances are capped at ${eur0(config.motorCapEur)} and adjusted for CO₂.`
              : "Capital cost of the qualifying asset."
          }
        />

        <div className="mt-auto border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Not included
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            One asset, the standard write-off. Balancing allowances or charges on
            disposal, private-use restrictions, leasing rules and scheme-specific
            building reliefs can each change the position: that&rsquo;s a
            conversation, not a slider.
          </p>
        </div>
      </div>

      {/* results */}
      <div className="flex flex-col">
        <div className="border border-line bg-surface">
          {/* hero */}
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {heroLabel}
              </p>
              <span className="text-xs text-muted tabular-nums">
                {cls.label}
              </span>
            </div>
            <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {money(heroValue)}
            </p>
            <p className="mt-2.5 text-sm text-muted">
              {heroSub} ·{" "}
              <span className="font-semibold text-primary-600 tabular-nums">
                {money(r.totalAllowances)}
              </span>{" "}
              written off in total
            </p>
          </div>

          {/* breakdown */}
          <dl className="divide-y divide-line">
            <Row label="Cost" value={money(r.cost)} />
            {r.restricted && (
              <Row
                dotClass="bg-navy-900"
                label="Allowable cost"
                sub={
                  co2Group === "group3"
                    ? "no relief for this CO₂ band"
                    : `capped at ${eur0(config.motorCapEur)}${
                        co2Group === "group2" ? " × 50% (CO₂)" : ""
                      }`
                }
                value={money(r.allowableCost)}
              />
            )}
            <Row
              dotClass="bg-primary-500"
              label={r.firstYearFull ? "Year-one allowance" : "Annual allowance"}
              sub={
                r.firstYearFull
                  ? `100% of ${money(r.allowableCost)}`
                  : `${money(r.allowableCost)} × ${r.ratePercent}%`
              }
              value={money(heroValue)}
            />
            <Row
              label="Written off over"
              value={r.firstYearFull ? "1 year" : `${r.years} years`}
            />
            <Row label="Total allowances" value={money(r.totalAllowances)} strong />
            <Row
              dotClass="bg-primary-300"
              label={`Tax saving at ${config.tradingCtPercent}%`}
              sub="cash value over the write-off period"
              value={money(r.taxSaving)}
            />
          </dl>
        </div>

        <ResultDisclaimer asOf={CA_LAST_REVIEWED} sourceUrl={CA_SOURCE_URL} />
      </div>
    </div>
  );
}
