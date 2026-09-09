"use client";

/* Ireland Capital Gains Tax calculator. Proceeds less the indexed allowable
   cost gives the gain; PPR relief, losses and the €1,270 exemption reduce it;
   the rate (33%, or 10% Entrepreneur Relief / 40% / 15%) gives the CGT due.

   The rates and the indexation multiplier table are passed in as props: the
   server page reads them from Supabase (editable at /admin/cgt-rates) and falls
   back to the code defaults. All maths live in ../lib/ireland-cgt. */

import { useMemo, useState } from "react";
import {
  computeCgt,
  CGT_LAST_REVIEWED,
  CGT_SOURCE_URL,
  type CgtConfig,
  type CgtMultiplier,
  type CgtResult,
  type RateMode,
} from "../lib/ireland-cgt";
import {
  CurrencyField,
  NumericField,
  ProportionBar,
  ResultDisclaimer,
  SegmentedField,
  SelectField,
} from "./calculator-fields";

const money = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* Checkbox that reveals an optional section: keeps the common case simple. */
function SectionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 border border-line bg-surface-muted px-4 py-2.5 text-sm font-medium text-ink-body transition-colors duration-200 hover:text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-primary-500"
      />
      {label}
    </label>
  );
}

/* One breakdown line: label (+ optional sub) · value. */
function Row({
  label,
  sub,
  value,
  strong,
  muted,
}: {
  label: string;
  sub?: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 px-5 py-3 sm:px-6 ${
        muted ? "bg-surface-muted" : ""
      }`}
    >
      <div>
        <span className={`text-sm ${strong ? "font-semibold text-ink" : "text-ink-body"}`}>
          {label}
        </span>
        {sub && <span className="mt-0.5 block text-xs text-muted tabular-nums">{sub}</span>}
      </div>
      <span
        className={`shrink-0 tabular-nums ${
          strong ? "font-display text-sm font-semibold text-ink" : "text-sm font-medium text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ResultCard({ r }: { r: CgtResult }) {
  const view = r.isLoss
    ? { tag: { text: "Allowable loss", cls: "bg-navy-900 text-white" }, hero: r.disposalLoss, sub: "No CGT: this disposal is a loss you can carry forward or set against other gains." }
    : r.totalTax > 0
      ? { tag: { text: "CGT due", cls: "bg-primary-500 text-white" }, hero: r.totalTax, sub: `Effective rate ${r.effectiveRatePercent}% of the taxable gain.` }
      : { tag: { text: "No CGT", cls: "border border-line bg-surface-muted text-muted" }, hero: 0, sub: "The gain is covered by reliefs, losses and the annual exemption." };

  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Capital gains tax
          </p>
          <span
            className={`rounded-none px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${view.tag.cls}`}
          >
            {view.tag.text}
          </span>
        </div>
        <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
          {money(view.hero)}
        </p>
        <p className="mt-2.5 text-sm text-muted">{view.sub}</p>
        {r.bands.length > 0 && (
          <div className="mt-4">
            <ProportionBar
              segments={[
                { label: `Tax ${money(r.totalTax)}`, value: r.totalTax, className: "bg-primary-500" },
                {
                  label: `Kept ${money(Math.max(0, r.taxableGain - r.totalTax))}`,
                  value: Math.max(0, r.taxableGain - r.totalTax),
                  className: "bg-navy-900",
                },
              ]}
            />
          </div>
        )}
      </div>

      <dl className="divide-y divide-line">
        <Row label="Sale proceeds" value={money(r.proceeds)} />
        <Row
          label="Less allowable cost"
          sub={
            r.indexedAcquisition !== r.acquisitionCost || r.indexedEnhancement !== r.enhancementCost
              ? "incl. indexation relief"
              : undefined
          }
          value={`− ${money(r.allowableCost)}`}
        />
        <Row label={r.rawGain < 0 ? "Loss on disposal" : "Chargeable gain"} value={money(r.rawGain)} strong />
        {r.pprRelief > 0 && (
          <Row label="Less PPR relief" sub={`${r.exemptFractionPercent}% main-home exemption`} value={`− ${money(r.pprRelief)}`} />
        )}
        {r.lossesApplied > 0 && <Row label="Less allowable losses" value={`− ${money(r.lossesApplied)}`} />}
        {r.exemptionApplied > 0 && (
          <Row label="Less annual exemption" value={`− ${money(r.exemptionApplied)}`} />
        )}
        <Row label="Taxable gain" value={money(r.taxableGain)} strong />
        {r.bands.map((b) => (
          <Row
            key={b.label}
            label={b.label}
            sub={`${money(b.amount)} × ${b.ratePercent}%`}
            value={money(b.tax)}
          />
        ))}
        <Row label="Total CGT due" value={money(r.totalTax)} strong muted />
        {r.lossCarried > 0 && (
          <Row label="Losses carried forward" value={money(r.lossCarried)} />
        )}
        {r.paymentDue && <Row label="Payment due" value={r.paymentDue} />}
      </dl>
    </div>
  );
}

export function IrelandCgtCalculator({
  config,
  multipliers,
}: {
  config: CgtConfig;
  multipliers: CgtMultiplier[];
}) {
  const [proceeds, setProceeds] = useState(0);
  const [disposalCosts, setDisposalCosts] = useState(0);
  const [acquisitionCost, setAcquisitionCost] = useState(0);
  const [acqYearKey, setAcqYearKey] = useState("none");
  const [disposalMonth, setDisposalMonth] = useState("");

  const [showEnhancement, setShowEnhancement] = useState(false);
  const [enhancementCost, setEnhancementCost] = useState(0);
  const [enhYearKey, setEnhYearKey] = useState("none");

  const [showLosses, setShowLosses] = useState(false);
  const [currentYearLosses, setCurrentYearLosses] = useState(0);
  const [broughtForwardLosses, setBroughtForwardLosses] = useState(0);

  const [showRelief, setShowRelief] = useState(false);
  const [rateMode, setRateMode] = useState<RateMode>("standard");
  const [entrepreneurUsed, setEntrepreneurUsed] = useState(0);

  const [showPpr, setShowPpr] = useState(false);
  const [monthsOwned, setMonthsOwned] = useState(0);
  const [monthsOccupied, setMonthsOccupied] = useState(0);

  const multMap = useMemo(
    () => new Map(multipliers.map((m) => [m.yearKey, m.multiplier])),
    [multipliers],
  );
  const acqMult = acqYearKey === "none" ? 1 : multMap.get(acqYearKey) ?? 1;
  const enhMult = enhYearKey === "none" ? 1 : multMap.get(enhYearKey) ?? 1;

  const r = useMemo(
    () =>
      computeCgt(
        {
          proceeds,
          disposalCosts,
          acquisitionCost,
          acquisitionMultiplier: acqMult,
          enhancementCost: showEnhancement ? enhancementCost : 0,
          enhancementMultiplier: showEnhancement ? enhMult : 1,
          currentYearLosses: showLosses ? currentYearLosses : 0,
          broughtForwardLosses: showLosses ? broughtForwardLosses : 0,
          applyExemption: true,
          ppr: showPpr ? { monthsOwned, monthsOccupied } : undefined,
          rateMode: showRelief ? rateMode : "standard",
          entrepreneurReliefUsedEur: entrepreneurUsed,
          disposalMonth: disposalMonth ? Number(disposalMonth) : undefined,
        },
        config,
      ),
    [
      proceeds, disposalCosts, acquisitionCost, acqMult, showEnhancement, enhancementCost,
      enhMult, showLosses, currentYearLosses, broughtForwardLosses, showPpr, monthsOwned,
      monthsOccupied, showRelief, rateMode, entrepreneurUsed, disposalMonth, config,
    ],
  );

  const rateOptions: { value: RateMode; label: string }[] = [
    { value: "standard", label: `Standard ${config.standardRatePercent}%` },
    { value: "entrepreneur", label: `Entrepreneur ${config.entrepreneurRatePercent}%` },
    { value: "rate40", label: "Foreign life 40%" },
    { value: "rate15", label: "VC fund 15%" },
  ];

  const yearOptions = (
    <>
      <option value="none">No indexation applies (×1.000)</option>
      {multipliers.map((m) => (
        <option key={m.yearKey} value={m.yearKey}>
          {m.yearLabel} (×{m.multiplier})
        </option>
      ))}
    </>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* inputs */}
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-primary-500 bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
          <span className="font-semibold text-ink">Indexation relief.</span> The cost of
          an asset bought before 2003 is uplifted by Revenue&rsquo;s multiplier for the
          year you bought it, so only the real gain is taxed. Costs from 2003 on get no
          uplift (×1.000).
        </div>

        <CurrencyField
          label="Sale proceeds"
          value={proceeds}
          onChange={setProceeds}
          hint="What you sold the asset for (or its market value on a gift/transfer)."
        />
        <CurrencyField
          label="Selling costs"
          value={disposalCosts}
          onChange={setDisposalCosts}
          hint="Incidental costs of disposal: solicitor, auctioneer, agent fees. Not indexed."
        />
        <CurrencyField
          label="Acquisition cost"
          value={acquisitionCost}
          onChange={setAcquisitionCost}
          hint="What you paid, including buying fees (solicitor, stamp duty). This is the figure indexation uplifts."
        />
        <SelectField
          label="Year the asset was acquired"
          value={acqYearKey}
          onChange={setAcqYearKey}
          hint="Picks the indexation multiplier. Only pre-2003 years uplift the cost."
        >
          {yearOptions}
        </SelectField>

        {acquisitionCost > 0 && acqMult !== 1 && (
          <div className="border border-line bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
            Indexed cost: {money(acquisitionCost)} × {acqMult} ={" "}
            <span className="font-semibold text-ink tabular-nums">{money(r.indexedAcquisition)}</span>
          </div>
        )}

        <SelectField
          label="Month of sale (optional)"
          value={disposalMonth}
          onChange={setDisposalMonth}
          hint="Sets the CGT payment date: Jan–Nov is due 15 December, December is due 31 January."
        >
          <option value="">Select a month…</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </SelectField>

        {/* optional sections */}
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <SectionToggle label="Improvement / enhancement costs" checked={showEnhancement} onChange={setShowEnhancement} />
          {showEnhancement && (
            <div className="flex flex-col gap-4 border-l-[3px] border-line pl-4">
              <CurrencyField
                label="Enhancement expenditure"
                value={enhancementCost}
                onChange={setEnhancementCost}
                hint="Money spent adding value (extensions, improvements): not repairs."
              />
              <SelectField label="Year of the enhancement" value={enhYearKey} onChange={setEnhYearKey}>
                {yearOptions}
              </SelectField>
            </div>
          )}

          <SectionToggle label="Allowable losses" checked={showLosses} onChange={setShowLosses} />
          {showLosses && (
            <div className="flex flex-col gap-4 border-l-[3px] border-line pl-4">
              <CurrencyField
                label="Losses this year"
                value={currentYearLosses}
                onChange={setCurrentYearLosses}
                hint="Allowable capital losses on other disposals in the same year."
              />
              <CurrencyField
                label="Losses brought forward"
                value={broughtForwardLosses}
                onChange={setBroughtForwardLosses}
                hint="Unused allowable losses carried forward from earlier years."
              />
            </div>
          )}

          <SectionToggle label="Relief / different rate" checked={showRelief} onChange={setShowRelief} />
          {showRelief && (
            <div className="flex flex-col gap-4 border-l-[3px] border-line pl-4">
              <SegmentedField<RateMode> label="Rate" value={rateMode} onChange={setRateMode} options={rateOptions} />
              {rateMode === "entrepreneur" && (
                <CurrencyField
                  label="Entrepreneur Relief already used (lifetime)"
                  value={entrepreneurUsed}
                  onChange={setEntrepreneurUsed}
                  hint={`Gains already relieved at ${config.entrepreneurRatePercent}%. The lifetime cap is ${money(config.entrepreneurLifetimeCapEur)}; anything above it is taxed at ${config.standardRatePercent}%.`}
                />
              )}
            </div>
          )}

          <SectionToggle label="Main home (PPR) relief" checked={showPpr} onChange={setShowPpr} />
          {showPpr && (
            <div className="flex flex-col gap-4 border-l-[3px] border-line pl-4">
              <NumericField
                label="Months owned"
                value={monthsOwned}
                onChange={setMonthsOwned}
                hint="Total months you owned the property."
              />
              <NumericField
                label="Months lived in as your main home"
                value={monthsOccupied}
                onChange={setMonthsOccupied}
                hint="The last 12 months always count if it was ever your main home."
              />
            </div>
          )}
        </div>
      </div>

      {/* results */}
      <div className="flex flex-col">
        <ResultCard r={r} />
        <ResultDisclaimer asOf={CGT_LAST_REVIEWED} sourceUrl={CGT_SOURCE_URL} />
      </div>
    </div>
  );
}
