"use client";

/* Ireland CAT calculator: gift & inheritance tax for one benefit.
   Left: inputs (benefit type, relationship, value, liabilities, relief, small
   gift toggle, prior same-group benefits, valuation month). Right: the computed
   breakdown: market value → incumbrance-free → relief → small gift → taxable →
   threshold → CAT due. All maths live in ../lib/ireland-cat (single source). */

import { useState } from "react";
import {
  computeCat,
  RELATIONSHIPS,
  CAT_LAST_REVIEWED,
  CAT_SOURCE_URL,
  type BenefitType,
  type CatConfig,
  type Relationship,
  type ReliefKind,
} from "../lib/ireland-cat";
import {
  CurrencyField,
  SegmentedField,
  SelectField,
  ResultDisclaimer,
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

const GROUP_NOTE: Record<Relationship, string> = {
  child: "A child of the disponer.",
  parent: "Parent: Group A on an absolute inheritance, Group B on a gift.",
  sibling: "A brother or sister of the disponer.",
  "niece-nephew": "A niece or nephew of the disponer.",
  grandchild: "A grandchild (lineal descendant).",
  grandparent: "A grandparent (lineal ancestor).",
  "uncle-aunt": "An uncle or aunt of the disponer.",
  cousin: "A cousin.",
  "in-law": "An in-law.",
  other: "Any other relationship or a friend.",
};

function Line({ label, value, strong = false, muted = false }: {
  label: string; value: string; strong?: boolean; muted?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-4 px-5 py-3 sm:px-6 ${strong ? "bg-surface-muted" : ""}`}>
      <span className={`text-sm ${strong ? "font-semibold text-ink" : muted ? "text-muted" : "text-ink-body"}`}>
        {label}
      </span>
      <span className={`tabular-nums ${strong ? "font-display text-sm font-semibold text-ink" : "text-sm font-medium text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

export function IrelandCatCalculator({ config }: { config: CatConfig }) {
  const [benefitType, setBenefitType] = useState<BenefitType>("gift");
  const [relationship, setRelationship] = useState<Relationship>("child");
  const [marketValue, setMarketValue] = useState(0);
  const [deductibleLiabilities, setDeductibleLiabilities] = useState(0);
  const [relief, setRelief] = useState<ReliefKind>("none");
  const [applySmallGift, setApplySmallGift] = useState(true);
  const [priorBenefits, setPriorBenefits] = useState(0);
  const [valuationMonth, setValuationMonth] = useState(6);

  const r = computeCat(
    {
      benefitType,
      relationship,
      marketValue,
      deductibleLiabilities,
      relief,
      applySmallGiftExemption: applySmallGift,
      priorBenefits,
      valuationMonth,
    },
    config,
  );

  const isGift = benefitType === "gift";

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* inputs */}
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-primary-500 bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
          <span className="font-semibold text-ink">Gift or inheritance.</span> Enter one
          benefit, who received it, its value and any relief, and see the CAT due after
          the group threshold and, for gifts, the €{config.smallGiftExemptionEur.toLocaleString("en-IE")} small-gift exemption.
        </div>

        <SegmentedField<BenefitType>
          label="Benefit type"
          value={benefitType}
          onChange={setBenefitType}
          options={[
            { value: "gift", label: "Gift" },
            { value: "inheritance", label: "Inheritance" },
          ]}
        />

        <SelectField
          label="Relationship (beneficiary is the disponer's…)"
          value={relationship}
          onChange={(v) => setRelationship(v as Relationship)}
          hint={
            <>
              {GROUP_NOTE[relationship]} Group{" "}
              <span className="font-semibold text-ink">{r.group}</span>: threshold{" "}
              <span className="font-semibold text-ink">{money(r.groupThreshold)}</span>.
            </>
          }
        >
          {RELATIONSHIPS.map((rel) => (
            <option key={rel.value} value={rel.value}>{rel.label}</option>
          ))}
        </SelectField>

        <CurrencyField
          label="Market value of the benefit"
          value={marketValue}
          onChange={setMarketValue}
          hint="What the gift or inheritance is worth."
        />

        <CurrencyField
          label="Deductible liabilities & costs"
          value={deductibleLiabilities}
          onChange={setDeductibleLiabilities}
          hint="Debts, costs or consideration paid by the beneficiary: reduce the taxable value."
        />

        <SegmentedField<ReliefKind>
          label="Relief"
          value={relief}
          onChange={setRelief}
          options={[
            { value: "none", label: "None" },
            { value: "agricultural", label: `Agricultural ${config.reliefs.agriculturalPercent}%` },
            { value: "business", label: `Business ${config.reliefs.businessPercent}%` },
            { value: "dwelling-house", label: `Dwelling house ${config.reliefs.dwellingHousePercent}%` },
          ]}
        />

        {isGift && (
          <SegmentedField<"on" | "off">
            label={`Apply €${config.smallGiftExemptionEur.toLocaleString("en-IE")} small-gift exemption`}
            value={applySmallGift ? "on" : "off"}
            onChange={(v) => setApplySmallGift(v === "on")}
            options={[
              { value: "on", label: "Apply" },
              { value: "off", label: "Skip" },
            ]}
          />
        )}

        <CurrencyField
          label="Prior benefits in this group (since 5 Dec 1991)"
          value={priorBenefits}
          onChange={setPriorBenefits}
          hint="Taxable value of earlier gifts/inheritances in the SAME group: they use up the threshold."
        />

        <SelectField
          label="Valuation month"
          value={String(valuationMonth)}
          onChange={(v) => setValuationMonth(Number(v))}
          hint={r.paymentDue ? `Pay & file by ${r.paymentDue}.` : undefined}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </SelectField>
      </div>

      {/* result */}
      <div className="flex flex-col">
        <div className="border border-line bg-surface">
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                CAT due
              </p>
              <span className="rounded-none bg-navy-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Group {r.group} · {r.ratePercent}%
              </span>
            </div>
            <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {money(r.catDue)}
            </p>
            <p className="mt-2.5 text-sm text-muted">
              {r.taxableExcess > 0
                ? `on ${money(r.taxableExcess)} above the ${money(r.groupThreshold)} Group ${r.group} threshold.`
                : `nothing to pay: within the ${money(r.groupThreshold)} Group ${r.group} threshold.`}
            </p>
          </div>
          <dl className="divide-y divide-line">
            <Line label="Market value" value={money(r.marketValue)} />
            {r.deductibleLiabilities > 0 && (
              <Line label="Less liabilities & costs" value={`− ${money(r.deductibleLiabilities)}`} muted />
            )}
            {r.reliefPercent > 0 && (
              <Line label={`Less ${r.reliefLabel} (${r.reliefPercent}%)`} value={`− ${money(r.reliefAmount)}`} muted />
            )}
            {r.smallGiftExemptionApplied > 0 && (
              <Line label="Less small-gift exemption" value={`− ${money(r.smallGiftExemptionApplied)}`} muted />
            )}
            <Line label="Taxable value of this benefit" value={money(r.currentTaxableValue)} />
            {r.priorBenefits > 0 && (
              <Line label="Prior benefits in group" value={money(r.priorBenefits)} muted />
            )}
            <Line label="Threshold remaining" value={money(r.thresholdRemaining)} muted />
            <Line label="Taxable excess" value={money(r.taxableExcess)} />
            <Line label={`CAT at ${r.ratePercent}%`} value={money(r.catDue)} strong />
          </dl>
          <p className="border-t border-line px-5 py-3 text-xs leading-5 text-muted sm:px-6">
            {r.paymentDue
              ? `Based on a ${MONTHS[valuationMonth - 1]} valuation date, the return and payment are due ${r.paymentDue}.`
              : "Set a valuation month to see the pay & file date."}
          </p>
        </div>
        <ResultDisclaimer asOf={CAT_LAST_REVIEWED} sourceUrl={CAT_SOURCE_URL} />
      </div>
    </div>
  );
}
