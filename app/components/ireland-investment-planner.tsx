"use client";

/* Personal investment options planner, in the site theme.
   Three questions (timeframe, risk, then the refinements) with the matching
   options ranked underneath as the answers change. All data and maths live in
   ../lib/ireland-investment so the figures stay in one auditable place.

   This is a comparison tool, not advice: it ranks option TYPES by return after
   Irish tax. It knows nothing about the user, so nothing here may be phrased
   as a recommendation, and the standing caveat below must not be removed. */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  CATEGORY_LABELS,
  DATA_AS_OF,
  DEFAULT_INPUTS,
  HORIZONS,
  RISK_LEVELS,
  SECTOR_LABELS,
  formatEuro,
  formatPercent,
  grossEquivalent,
  planInvestments,
  type Horizon,
  type OptionResult,
  type PlannerInputs,
  type RiskLevel,
  type SectorFilter,
} from "../lib/ireland-investment";

/* ---------- small shared pieces ---------- */

const cardBase =
  "cursor-pointer rounded-none border p-4 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500";
const cardOn = "border-primary-400 bg-primary-50/50";
const cardOff = "border-line bg-surface hover:border-ink/30";

function StepHeading({ step, title, hint }: { step: string; title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <span className="font-display text-xs font-semibold tracking-[0.16em] text-primary-500">
        {step}
      </span>
      <h3 className="mt-1 font-display text-xl font-bold tracking-[-0.01em] text-ink">
        {title}
      </h3>
      {hint && <p className="mt-1 text-sm leading-6 text-muted">{hint}</p>}
    </div>
  );
}

function RiskPill({ risk }: { risk: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted"
      title={`Risk ${risk} of 5`}
    >
      <span aria-hidden="true" className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-1.5 ${n <= risk ? "bg-primary-500" : "bg-line"}`}
          />
        ))}
      </span>
      Risk {risk}/5
    </span>
  );
}

/* ---------- inputs ---------- */

function AmountField({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  /* Local text buffer: echoing String(value) back into a controlled number
     input destroys mid-keystroke entry (a lone "0" renders empty, "50000"
     typed one key at a time keeps re-snapping). */
  const [text, setText] = useState(value ? String(value) : "");
  return (
    <div className="max-w-xs">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        Amount to invest
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          €
        </span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step="any"
          placeholder="0"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = e.target.value === "" ? 0 : Number(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="h-11 w-full rounded-none border border-line bg-surface pl-7 pr-3 text-sm tabular-nums text-ink transition-colors duration-200 focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40"
        />
      </div>
    </div>
  );
}

function Segmented<T extends string>({
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

/* ---------- one result row ---------- */

function ResultRow({ result, rank, years }: { result: OptionResult; rank: number; years: number }) {
  const { option } = result;
  const taxFree = result.effectiveTaxRate === 0 && option.category !== "pension";

  return (
    <li className="border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold text-primary-500">
              {String(rank).padStart(2, "0")}
            </span>
            <h4 className="font-display text-base font-medium tracking-tight text-ink">
              {option.name}
            </h4>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="border border-line bg-surface-muted px-2 py-0.5 font-semibold">
              {SECTOR_LABELS[option.sector]}
            </span>
            <span className="border border-line bg-surface-muted px-2 py-0.5 font-semibold">
              {CATEGORY_LABELS[option.category]}
            </span>
            <RiskPill risk={option.risk} />
            {option.guarantee === "state-full" && (
              <span className="border border-primary-300 bg-primary-50 px-2 py-0.5 font-semibold text-primary-600">
                State-guaranteed in full
              </span>
            )}
            {option.guarantee === "dgs" && (
              <span className="border border-line bg-surface-muted px-2 py-0.5 font-semibold">
                €100k deposit guarantee
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="block font-display text-2xl font-bold tabular-nums text-ink">
            {formatPercent(result.netReturn)}
          </span>
          <span className="block text-[11px] text-muted">a year, after Irish tax</span>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Gross return</dt>
          <dd className="mt-0.5 tabular-nums text-ink">
            {option.grossLow === option.grossHigh
              ? formatPercent(option.grossLow)
              : `${formatPercent(option.grossLow)} – ${formatPercent(option.grossHigh)}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Tax treatment</dt>
          <dd className="mt-0.5 text-ink">
            {option.taxTreatment}
            {result.effectiveTaxRate > 0 && (
              <span className="text-muted">
                {" "}
                ({formatPercent(result.effectiveTaxRate, 0)} effective)
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Access</dt>
          <dd className="mt-0.5 text-ink">{option.liquidity}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Minimum / cap</dt>
          <dd className="mt-0.5 tabular-nums text-ink">
            {option.minimum > 0 ? formatEuro(option.minimum) : "None"}
            <span className="text-muted"> · {option.cap}</span>
          </dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <dt className="text-xs text-muted">
            Value after {years} years, at the mid of the range
          </dt>
          <dd className="mt-0.5 tabular-nums text-ink">
            <span className="font-semibold">{formatEuro(result.projectedValue)}</span>
            <span className="text-muted">
              {" "}
              · {result.gain >= 0 ? "+" : ""}
              {formatEuro(result.gain)}
            </span>
          </dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <dt className="text-xs text-muted">After 2% inflation</dt>
          <dd
            className={`mt-0.5 tabular-nums ${
              result.realReturn > 0 ? "text-ink" : "text-primary-600"
            }`}
          >
            {formatPercent(result.realReturn)} a year
            {result.realReturn <= 0 && ", loses purchasing power"}
          </dd>
        </div>
      </dl>

      {taxFree && (
        <p className="mt-4 border-l-2 border-primary-400 pl-3 text-sm leading-6 text-ink">
          Tax-free, so worth {formatPercent(grossEquivalent(result.grossMid, 0.33))} gross to a
          33% DIRT payer.
        </p>
      )}

      <p className="mt-4 text-sm leading-6 text-muted">{option.note}</p>

      {result.flags.length > 0 && (
        <ul className="mt-3 space-y-1">
          {result.flags.map((flag) => (
            <li key={flag} className="flex gap-2 text-sm leading-6 text-ink">
              <span aria-hidden="true" className="text-primary-500">
                !
              </span>
              {flag}
            </li>
          ))}
        </ul>
      )}

      {/* Where an Irish resident actually goes for this. New tab, because the
          planner holds the answers the visitor has just entered and losing
          them to an outbound click is the obvious annoyance. */}
      <a
        href={option.link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-none border border-ink/20 px-5 text-sm font-semibold tracking-wide text-ink transition-[color,background-color,border-color] duration-200 hover:border-primary-400 hover:bg-primary-50/60 hover:text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        {option.link.label}
        <span aria-hidden="true">↗</span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </li>
  );
}

/* ---------- the planner ---------- */

export function IrelandInvestmentPlanner() {
  const [amount, setAmount] = useState(DEFAULT_INPUTS.amount);
  const [horizon, setHorizon] = useState<Horizon>(DEFAULT_INPUTS.horizon);
  const [risk, setRisk] = useState<RiskLevel>(DEFAULT_INPUTS.risk);
  const [marginalRate, setMarginalRate] = useState(DEFAULT_INPUTS.marginalRate);
  const [sector, setSector] = useState<SectorFilter>(DEFAULT_INPUTS.sector);
  const [guaranteedOnly, setGuaranteedOnly] = useState(DEFAULT_INPUTS.guaranteedOnly);

  const inputs: PlannerInputs = useMemo(
    () => ({
      amount,
      horizon,
      risk,
      marginalRate,
      sector,
      guaranteedOnly,
      inflation: DEFAULT_INPUTS.inflation,
    }),
    [amount, horizon, risk, marginalRate, sector, guaranteedOnly],
  );

  const plan = useMemo(() => planInvestments(inputs), [inputs]);
  const guaranteedId = useId();

  return (
    <div>
      {/* ---- step 1: timeframe ---- */}
      <section aria-labelledby="step-timeframe">
        <StepHeading
          step="01"
          title="How long is the money invested for?"
          hint="The horizon rules out anything that locks capital for longer than you have."
        />
        <h3 id="step-timeframe" className="sr-only">
          Timeframe
        </h3>
        <AmountField value={amount} onChange={setAmount} />
        <div role="radiogroup" aria-label="Investment horizon" className="mt-5 grid gap-3 sm:grid-cols-3">
          {HORIZONS.map((h) => {
            const active = h.value === horizon;
            return (
              <button
                key={h.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setHorizon(h.value)}
                className={`${cardBase} ${active ? cardOn : cardOff}`}
              >
                <span className="block font-display text-lg font-bold tracking-[-0.01em] text-ink">
                  {h.label}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">{h.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- step 2: risk ---- */}
      <section aria-labelledby="step-risk" className="mt-12 border-t border-line pt-10">
        <StepHeading
          step="02"
          title="How much investment risk is acceptable?"
          hint="Everything at or below the level you pick is shown. 1 is cash, 5 includes options that can lose everything."
        />
        <h3 id="step-risk" className="sr-only">
          Risk
        </h3>
        <div role="radiogroup" aria-label="Risk level" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {RISK_LEVELS.map((level) => {
            const active = level.value === risk;
            return (
              <button
                key={level.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRisk(level.value)}
                className={`${cardBase} ${active ? cardOn : cardOff}`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 w-1.5 ${
                          n <= level.value ? "bg-primary-500" : "bg-line"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="font-display text-sm font-bold text-ink">{level.label}</span>
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-muted">{level.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- step 3: refinements ---- */}
      <section aria-labelledby="step-refine" className="mt-12 border-t border-line pt-10">
        <StepHeading
          step="03"
          title="Anything else that narrows it"
          hint="Your marginal rate decides the net return on anything taxed as income: bond coupons, rent and private credit."
        />
        <h3 id="step-refine" className="sr-only">
          Refinements
        </h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Segmented
            label="Your total marginal rate on income"
            value={String(marginalRate)}
            onChange={(v) => setMarginalRate(Number(v))}
            options={[
              { value: "0.52", label: "52% (higher)" },
              { value: "0.4", label: "40%" },
              { value: "0.2", label: "20% (standard)" },
            ]}
          />
          <Segmented
            label="Provider"
            value={sector}
            onChange={setSector}
            options={[
              { value: "all", label: "All" },
              { value: "state", label: "State-backed" },
              { value: "private", label: "Private" },
            ]}
          />
          <div className="flex items-end">
            <label
              htmlFor={guaranteedId}
              className="flex cursor-pointer items-start gap-3 border border-line bg-surface p-3 text-sm text-ink"
            >
              <input
                id={guaranteedId}
                type="checkbox"
                checked={guaranteedOnly}
                onChange={(e) => setGuaranteedOnly(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-primary-500"
              />
              <span>
                Capital must be guaranteed
                <span className="mt-0.5 block text-xs text-muted">
                  State guarantee or the €100,000 deposit guarantee only.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* ---- results ---- */}
      <section aria-labelledby="step-results" className="mt-12 border-t border-line pt-10">
        <StepHeading step="04" title="What fits those answers" />
        <h3 id="step-results" className="sr-only">
          Results
        </h3>

        <p className="text-sm leading-6 text-muted">
          {plan.results.length} of 32 options fit, ranked by return after Irish tax on{" "}
          {formatEuro(amount)} over {plan.years} years. Every one is open to an Irish
          resident, and each carries a link to where you actually go for it: the
          provider itself, or the Irish regulator where a category covers several.
          Ranking is arithmetic, not a recommendation, and the top line is often the
          riskier one.
        </p>

        {plan.warnings.length > 0 && (
          <ul className="mt-5 space-y-3">
            {plan.warnings.map((warning) => (
              <li
                key={warning}
                className="border-l-2 border-primary-400 bg-primary-50/40 p-4 text-sm leading-6 text-ink"
              >
                {warning}
              </li>
            ))}
          </ul>
        )}

        {plan.results.length > 0 && (
          <ol className="mt-6 space-y-4">
            {plan.results.map((result, index) => (
              <ResultRow
                key={result.option.id}
                result={result}
                rank={index + 1}
                years={plan.years}
              />
            ))}
          </ol>
        )}

        {plan.excluded.length > 0 && (
          <details className="mt-8 border border-line bg-surface-muted p-5">
            <summary className="cursor-pointer font-display text-sm font-semibold text-ink">
              {plan.excluded.length} options ruled out, and why
            </summary>
            <ul className="mt-4 space-y-2">
              {plan.excluded.map(({ option, reason }) => (
                <li key={option.id} className="text-sm leading-6">
                  <span className="text-ink">{option.name}</span>{" "}
                  <span className="text-muted">({reason})</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-8 border-t border-line pt-6">
          <p className="max-w-3xl text-sm leading-6 text-muted">
            Rates, reliefs and thresholds are current at {DATA_AS_OF} and change with each
            Budget and Finance Act. Deposit, State Savings and bond yields are contractual and
            quoted as such; every other range is long-run and illustrative, not a forecast, and
            real outcomes can be negative. AIBN advises on the tax treatment of an
            investment, not on the investment itself. We are not investment advisers and we do
            not recommend products. Before committing capital, take advice from an adviser
            authorised by the Central Bank of Ireland.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex text-sm font-semibold text-primary-500 transition-colors duration-200 hover:text-primary-600"
          >
            Talk to us about the tax side <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
