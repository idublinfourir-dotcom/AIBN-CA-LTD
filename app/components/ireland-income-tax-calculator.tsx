"use client";

/* Deloitte-Ireland-style Income Tax Calculator (Income Tax + USC + PRSI).
   Form → "Calculate Tax" → results screen (2026 vs 2025), in the site theme.
   All maths lives in ../lib/ireland-income-tax. Tax only, no mortgage here. */

import { useEffect, useId, useRef, useState } from "react";
import {
  compareYears,
  RATES_BY_YEAR,
  type IncomeTaxInput,
  type IncomeTaxResult,
  type YearComparison,
  type YearRates,
} from "../lib/ireland-income-tax";

const CURRENT_YEAR = 2026;
const PRIOR_YEAR = 2025;

/* Money in the results table: whole euros (rounded like Deloitte) shown as .00.
   Negatives come out as "-€4,987.00"; deduction rows wrap in parentheses. */
const money = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(n));

/* ---------- button styles (match app/components/ui.tsx Button) ---------- */

const btnBase =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none px-7 text-sm font-semibold tracking-wide transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2";
const btnPrimary = `${btnBase} bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-primary-500`;
const btnOutline = `${btnBase} border border-ink/20 text-ink hover:border-ink/40 hover:bg-ink/5 focus-visible:outline-ink/40`;

/* ---------- inputs ---------- */

function SegmentedField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-ink">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-1.5 flex flex-wrap gap-1.5 rounded-none border border-line bg-surface-muted p-1"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`flex-1 cursor-pointer rounded-none px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${
                active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <SegmentedField<"yes" | "no">
      label={label}
      value={value ? "yes" : "no"}
      onChange={(v) => onChange(v === "yes")}
      options={[
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]}
    />
  );
}

/* Numeric field with a local text buffer. Echoing String(parsedNumber) straight
   back into a controlled <input type="number"> destroys decimal entry: "5." is
   sanitised to "" mid-keystroke, "5.50" snaps back to "5.5" and moves the
   cursor, and a leading 0 renders as empty, so a user typing 5.5 could end up
   with 55. The buffer holds exactly what was typed; the parent only receives
   the parsed number, and the buffer re-syncs only when the parent value is
   changed externally (e.g. Clear Form). */
function useNumericText(value: number, onChange: (n: number) => void) {
  const [text, setText] = useState(value ? String(value) : "");
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = text === "" ? 0 : Number(text);
    if (parsed !== value) setText(value ? String(value) : "");
  }
  const handleChange = (raw: string) => {
    setText(raw);
    const n = raw === "" ? 0 : Number(raw);
    onChange(Number.isFinite(n) ? n : 0);
  };
  return { text, handleChange };
}

function CurrencyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  const id = useId();
  const { text, handleChange } = useNumericText(value, onChange);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          €
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder="0"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          className="h-11 w-full rounded-none border border-line bg-surface pl-7 pr-3 text-sm text-ink tabular-nums transition-colors duration-200 focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  const { text, handleChange } = useNumericText(value, onChange);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={120}
        step="any"
        placeholder="0"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-none border border-line bg-surface px-3 text-sm text-ink tabular-nums transition-colors duration-200 focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40"
      />
    </div>
  );
}

/* ---------- results table ---------- */

type RowVariant = "default" | "emphasis" | "net";

interface RowDef {
  label: string;
  rate?: string;
  value: (r: IncomeTaxResult) => number;
  deduct?: boolean;
  variant?: RowVariant;
  /** Row only shown when the calculation includes a spouse income. */
  spouseOnly?: boolean;
}

const rateLabel = (rate: number) => `${+(rate * 100).toFixed(2)}%`;

const buildRows = (rates: YearRates): RowDef[] => [
  { label: "Total Income", value: (r) => r.grossIncome },
  { label: "Your Income", value: (r) => r.yourIncome },
  { label: "Spouse Income", value: (r) => r.spouseIncome, spouseOnly: true },
  { label: "Qualifying Pension Deduction", value: (r) => r.pension.qualifying, deduct: true },
  {
    label: "Tax @ Lower Rate",
    rate: rateLabel(rates.incomeTax.standardRate),
    value: (r) => r.incomeTax.taxAtStandard,
  },
  {
    label: "Tax @ Higher Rate",
    rate: rateLabel(rates.incomeTax.higherRate),
    value: (r) => r.incomeTax.taxAtHigher,
  },
  { label: "Tax Credits", value: (r) => r.incomeTax.totalCredits, deduct: true },
  { label: "Net Tax", value: (r) => r.incomeTax.netTax, deduct: true, variant: "emphasis" },
  { label: "Universal Social Charge", value: (r) => r.usc.total + r.spouseUsc.total, deduct: true },
  {
    label: "Annual Net Income before deduction for PRSI",
    value: (r) => r.netIncomeBeforePrsi,
    variant: "emphasis",
  },
  { label: "PRSI", value: (r) => r.prsi.total + r.spousePrsi.total, deduct: true },
  { label: "Annual Net Income", value: (r) => r.netIncome, variant: "net" },
  { label: "Monthly Net Income", value: (r) => r.monthlyNetIncome, variant: "net" },
  { label: "Weekly Net Income", value: (r) => r.weeklyNetIncome, variant: "net" },
];

function AmountCell({ row, r }: { row: RowDef; r: IncomeTaxResult }) {
  const text = row.deduct ? `(${money(row.value(r))})` : money(row.value(r));
  return (
    <td className="px-4 py-2.5 text-right tabular-nums text-ink">
      {row.rate && <span className="mr-3 text-xs text-muted">({row.rate})</span>}
      {text}
    </td>
  );
}

function ResultsTable({
  comparison,
  rates,
}: {
  comparison: YearComparison;
  rates: YearRates;
}) {
  const { current, prior, delta } = comparison;
  const ROWS = buildRows(rates).filter(
    (row) => !row.spouseOnly || current.spouseIncome > 0,
  );
  const rowBg = (variant: RowVariant | undefined, i: number) => {
    if (variant === "net") return "bg-primary-50 font-semibold";
    if (variant === "emphasis") return "bg-surface-muted font-medium";
    return i % 2 === 0 ? "bg-surface" : "bg-surface-muted/50";
  };

  return (
    <div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-muted">
              <th className="px-4 py-3 text-left font-semibold text-muted" />
              <th className="px-4 py-3 text-right font-display text-base font-semibold text-primary-600">
                {CURRENT_YEAR}
              </th>
              <th className="px-4 py-3 text-right font-display text-base font-semibold text-ink">
                {PRIOR_YEAR}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className={rowBg(row.variant, i)}>
                <td className="px-4 py-2.5 text-left text-ink">{row.label}</td>
                <AmountCell row={row} r={current} />
                <AmountCell row={row} r={prior} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* difference block */}
      <div className="mt-8">
        <h3 className="text-center font-display text-base font-medium text-ink">
          Total difference between {CURRENT_YEAR} and {PRIOR_YEAR}
        </h3>
        <dl className="mx-auto mt-4 max-w-xl">
          {[
            { label: "Annual Net Income", v: delta.annual },
            { label: "Monthly Net Income", v: delta.monthly },
            { label: "Weekly Net Income", v: delta.weekly },
          ].map((d) => (
            <div
              key={d.label}
              className="flex items-baseline justify-between gap-4 border-t border-line py-3"
            >
              <dt className="text-sm text-muted">{d.label}</dt>
              <dd
                className={`font-display text-base font-semibold tabular-nums ${
                  d.v >= 0 ? "text-primary-600" : "text-secondary-600"
                }`}
              >
                {money(d.v)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ---------- calculator (form + results) ---------- */

const DEFAULTS: IncomeTaxInput = {
  maritalStatus: "single",
  hasChildOnChildBenefit: false,
  isPrincipalCarerOfDependentChild: false,
  age: 0,
  employmentIncome: 0,
  selfEmploymentOrOtherIncome: 0,
  pensionContribution: 0,
  spouseEmploymentIncome: 0,
  spouseSelfEmploymentOrOtherIncome: 0,
};

export function IrelandIncomeTaxCalculator({
  ratesByYear = RATES_BY_YEAR,
}: {
  /** Admin-managed per-year rates from the DB (tax-data.ts); static fallback. */
  ratesByYear?: Record<number, YearRates>;
}) {
  const [form, setForm] = useState<IncomeTaxInput>(DEFAULTS);
  const [result, setResult] = useState<YearComparison | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // After results render, bring the results section into view (not the page top).
  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const set = <K extends keyof IncomeTaxInput>(key: K, value: IncomeTaxInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const calculate = () => {
    setResult(compareYears(form, CURRENT_YEAR, PRIOR_YEAR, ratesByYear));
  };

  const newCalculation = () => {
    setForm(DEFAULTS);
    setResult(null);
  };

  if (result) {
    return (
      <div ref={resultsRef} className="scroll-mt-24">
        <ResultsTable comparison={result} rates={ratesByYear[CURRENT_YEAR]} />
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button type="button" className={btnOutline} onClick={() => setResult(null)}>
            ← Go Back
          </button>
          <button type="button" className={btnPrimary} onClick={newCalculation}>
            New Calculation
          </button>
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-muted">
          Estimate for the Republic of Ireland. PRSI uses the flat rate at the start of each
          year ({rateLabel(ratesByYear[CURRENT_YEAR].prsi.rate)} for {CURRENT_YEAR},{" "}
          {rateLabel(ratesByYear[PRIOR_YEAR].prsi.rate)} for {PRIOR_YEAR}). Married couples are
          jointly assessed with the second-income band increase; spouse USC and PRSI are
          computed on the spouse&apos;s own income (spouse assumed in the same USC age band).
          Excludes widowed bereavement-year uplift, medical-card USC relief and the 66+
          state-pension PRSI exemption.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        calculate();
      }}
    >
      <div className="flex flex-col gap-5">
        <h3 className="font-display text-lg font-medium text-ink">Status</h3>
        <SegmentedField
          label="Marital status"
          value={form.maritalStatus}
          onChange={(v) => set("maritalStatus", v)}
          options={[
            { value: "single", label: "Single" },
            { value: "married", label: "Married" },
            { value: "widowed", label: "Widowed" },
          ]}
        />
        <YesNoField
          label="Do you have a child(ren) in respect of whom you are in receipt of child benefit?"
          value={form.hasChildOnChildBenefit}
          onChange={(v) => set("hasChildOnChildBenefit", v)}
        />
        <YesNoField
          label="Do you have any dependent child(ren) of which you are the principal carer?"
          value={form.isPrincipalCarerOfDependentChild}
          onChange={(v) => set("isPrincipalCarerOfDependentChild", v)}
        />
        <NumberField
          label={`Your age attained during ${CURRENT_YEAR}`}
          value={form.age}
          onChange={(v) => set("age", v)}
        />

        <h3 className="mt-4 font-display text-lg font-medium text-ink">
          Income and allowances
        </h3>
        <CurrencyField
          label="Employment income"
          value={form.employmentIncome}
          onChange={(v) => set("employmentIncome", v)}
        />
        <CurrencyField
          label="Self-employment / other income"
          value={form.selfEmploymentOrOtherIncome}
          onChange={(v) => set("selfEmploymentOrOtherIncome", v)}
        />

        {form.maritalStatus === "married" && (
          <>
            <h3 className="mt-4 font-display text-lg font-medium text-ink">
              Spouse / civil partner income
            </h3>
            <CurrencyField
              label="Spouse employment income"
              value={form.spouseEmploymentIncome ?? 0}
              onChange={(v) => set("spouseEmploymentIncome", v)}
            />
            <CurrencyField
              label="Spouse self-employment / other income"
              value={form.spouseSelfEmploymentOrOtherIncome ?? 0}
              onChange={(v) => set("spouseSelfEmploymentOrOtherIncome", v)}
              hint="Married couples are jointly assessed, and a second income raises the 20% band by up to €35,000."
            />
          </>
        )}

        <CurrencyField
          label="Your pension contribution"
          value={form.pensionContribution}
          onChange={(v) => set("pensionContribution", v)}
          hint="Relief is capped by your age band and by €115,000 of earnings. Anything above that gets no relief."
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button type="submit" className={btnPrimary}>
          Calculate Tax
        </button>
        <button type="button" className={btnOutline} onClick={newCalculation}>
          Clear Form
        </button>
      </div>
    </form>
  );
}
