"use client";

/* Ireland R&D Corporation Tax Credit calculator: 35% of qualifying R&D spend,
   paid over three annual instalments (greater of 50% / €87,500 in year one,
   then 3/5 and the balance). The user enters only spend they judge eligible;
   this component never decides what qualifies. The editable rates/thresholds
   arrive as `config` (admin-editable, DB-backed with a code fallback); the
   maths + the two prose-only fields (effectiveBenefitPercent, effectiveFrom)
   live in ../lib/ireland-rd-tax-credit. */

import { useMemo, useState } from "react";
import {
  computeRdCredit,
  RD_CREDIT,
  RD_QUALIFYING_NOTE,
  RD_LAST_REVIEWED,
  RD_SOURCE_URL,
  type RdConfig,
} from "../lib/ireland-rd-tax-credit";
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

const eur0 = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/* One instalment row: swatch · year + when · amount. */
function InstalmentRow({
  dotClass,
  year,
  when,
  value,
}: {
  dotClass: string;
  year: string;
  when: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6">
      <div className="flex items-baseline gap-2.5">
        <LegendDot className={dotClass} />
        <div>
          <span className="text-sm text-ink-body">{year}</span>
          <span className="mt-0.5 block text-xs text-muted">{when}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}

export function IrelandRdTaxCreditCalculator({ config }: { config: RdConfig }) {
  const [spend, setSpend] = useState(0);
  const [grant, setGrant] = useState(0);

  const r = useMemo(() => computeRdCredit(spend, grant, config), [spend, grant, config]);
  const { year1, year2, year3 } = r.instalments;

  // Explain which arm of the instalment rule applied, in plain words.
  const instalmentNote = r.paidInFullYearOne
    ? `Your credit is ${eur0(config.firstYearThresholdEur)} or less, so the full amount is payable in year one.`
    : year1 === config.firstYearThresholdEur
      ? `The first ${eur0(config.firstYearThresholdEur)} is payable in year one (it beats 50% of your credit); the balance follows over years two and three.`
      : `Year one is 50% of the credit (it beats the ${eur0(config.firstYearThresholdEur)} floor); the balance splits 30% / 20% across years two and three.`;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* input */}
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-primary-500 bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
          <span className="font-semibold text-ink">A credit, not a deduction.</span>{" "}
          The R&amp;D credit is {config.ratePercent}% of qualifying spend and comes
          on top of the normal {config.tradingDeductionPercent}% trading
          deduction: a combined benefit of about{" "}
          {RD_CREDIT.effectiveBenefitPercent}%. It&rsquo;s
          paid to you over three years, or set against tax you owe.
        </div>

        <CurrencyField
          label="Qualifying R&D expenditure"
          value={spend}
          onChange={setSpend}
          hint={RD_QUALIFYING_NOTE}
        />

        <CurrencyField
          label="Grant funding received (if any)"
          value={grant}
          onChange={setGrant}
          hint="Enterprise Ireland, IDA or other grants toward the R&D. Grant-aided spend doesn't qualify, so it's deducted here. Leave at 0 if none."
        />

        {r.grantFunding > 0 && (
          <div className="border border-line bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
            Qualifying spend: {money(r.grossExpenditure)} −{" "}
            {money(r.grantFunding)} grant ={" "}
            <span className="font-semibold text-ink tabular-nums">
              {money(r.qualifyingSpend)}
            </span>
          </div>
        )}

        <div className="mt-auto border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            The hard part isn&rsquo;t the maths
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            Whether an activity passes the science test, which costs are eligible,
            subcontractor and grant limits, and the capital/revenue split all shape a
            real claim, and Revenue can audit it. Treat this as a sizing estimate,
            then let us build the claim. Applies to {RD_CREDIT.effectiveFrom}.
            {/* effectiveFrom is prose-only, not editable: stays in code. */}
          </p>
        </div>
      </div>

      {/* results */}
      <div className="flex flex-col">
        <div className="border border-line bg-surface">
          {/* hero: the credit */}
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                R&amp;D tax credit
              </p>
              <span className="text-xs text-muted tabular-nums">
                {config.ratePercent}% of {money(r.qualifyingSpend)}
              </span>
            </div>
            <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {money(r.credit)}
            </p>
            <p className="mt-2.5 text-sm text-muted">
              Plus a {money(r.tradingDeductionValue)} trading deduction ·{" "}
              <span className="font-semibold text-primary-600 tabular-nums">
                {money(r.combinedBenefit)}
              </span>{" "}
              combined benefit ({RD_CREDIT.effectiveBenefitPercent}%)
            </p>
            <div className="mt-4">
              <ProportionBar
                segments={[
                  { label: `Year 1 ${money(year1)}`, value: year1, className: "bg-primary-500" },
                  { label: `Year 2 ${money(year2)}`, value: year2, className: "bg-navy-900" },
                  { label: `Year 3 ${money(year3)}`, value: year3, className: "bg-primary-300" },
                ]}
              />
            </div>
          </div>

          {/* instalment schedule */}
          <dl className="divide-y divide-line">
            <InstalmentRow
              dotClass="bg-primary-500"
              year="Year 1 instalment"
              when="On filing: cash or offset"
              value={money(year1)}
            />
            <InstalmentRow
              dotClass="bg-navy-900"
              year="Year 2 instalment"
              when="12 months later"
              value={money(year2)}
            />
            <InstalmentRow
              dotClass="bg-primary-300"
              year="Year 3 instalment"
              when="24 months later"
              value={money(year3)}
            />
            <div className="flex items-baseline justify-between gap-4 bg-surface-muted px-5 py-3.5 sm:px-6">
              <span className="text-sm font-semibold text-ink">Total credit</span>
              <span className="font-display text-sm font-semibold text-ink tabular-nums">
                {money(r.credit)}
              </span>
            </div>
          </dl>

          <p className="border-t border-line px-5 py-3 text-xs leading-5 text-muted sm:px-6">
            {instalmentNote}
          </p>
        </div>

        {/* how it's paid: info note */}
        <div className="mt-5 border border-line bg-surface p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Paid in three instalments
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            The credit isn&rsquo;t netted against your Corporation Tax first: you
            elect, for each instalment, to offset it against tax due or take it as a
            cash refund. A claim of {eur0(config.firstYearThresholdEur)} or less is
            paid in full in year one.
          </p>
        </div>

        <ResultDisclaimer asOf={RD_LAST_REVIEWED} sourceUrl={RD_SOURCE_URL} />
      </div>
    </div>
  );
}
