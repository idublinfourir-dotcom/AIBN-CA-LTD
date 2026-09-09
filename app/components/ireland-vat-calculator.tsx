"use client";

/* Ireland VAT calculator: a business's net VAT position, as on the VAT3
   return. Two INPUT tabs, one per side:
   • VAT received: VAT you charge customers on SALES (output VAT, T1).
   • VAT paid:     VAT you pay suppliers on PURCHASES (input VAT, T2).
   The category dropdown mirrors across the tabs ("what you buy" defaults to
   "what you sell") but is independently changeable. Amounts are per side.

   The RESULT (right) is not a tab. It computes the verdict from both sides:
   received > paid → PAYABLE; paid > received → RECEIVABLE (e.g. KFC: €2.5M
   paid vs €2M received → €0.5M receivable).
   All maths + rates live in ../lib/ireland-vat (single source of truth). */

import { useState } from "react";
import {
  addVat,
  removeVat,
  vatPosition,
  getVatRate,
  VAT_CATEGORIES,
  VAT_LAST_REVIEWED,
  VAT_SOURCE_URL,
  type VatConfig,
  type VatPosition,
  type VatRate,
  type VatThresholds,
} from "../lib/ireland-vat";
import {
  CurrencyField,
  LegendDot,
  ProportionBar,
  ResultDisclaimer,
  SelectField,
} from "./calculator-fields";

type Side = "received" | "paid";

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

const keyOf = (label: string) =>
  (VAT_CATEGORIES.find((c) => c.label === label) ?? VAT_CATEGORIES[0]).rateKey;

/* ---------- category selector (shared markup) ---------- */

function CategorySelect({
  label,
  value,
  onChange,
  hint,
  rates,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: React.ReactNode;
  rates: VatRate[];
}) {
  return (
    <SelectField label={label} value={value} onChange={onChange} hint={hint}>
      {rates.map((r) => {
        const items = VAT_CATEGORIES.filter((c) => c.rateKey === r.key);
        if (items.length === 0) return null;
        return (
          <optgroup key={r.key} label={r.label}>
            {items.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label}
              </option>
            ))}
          </optgroup>
        );
      })}
    </SelectField>
  );
}

/* ---------- net position verdict (computed, not a tab) ---------- */

function VerdictCard({ pos }: { pos: VatPosition }) {
  const { outputVat: received, inputVat: paid, netVat, direction } = pos;

  const view = {
    payable: {
      tag: { text: "Payable", cls: "bg-navy-900 text-white" },
      eyebrow: "VAT payable",
      sub: "payable to Revenue for the period, because you received more VAT on sales than you paid on purchases.",
      netLabel: "Net VAT payable (T3)",
    },
    receivable: {
      tag: { text: "Receivable", cls: "bg-primary-500 text-white" },
      eyebrow: "VAT receivable",
      sub: "receivable from Revenue for the period, because you paid more VAT on purchases than you received on sales.",
      netLabel: "Net VAT repayable (T4)",
    },
    balanced: {
      tag: { text: "Balanced", cls: "border border-line bg-surface-muted text-muted" },
      eyebrow: "VAT position",
      sub: "VAT received and VAT paid are equal, so nothing is due either way.",
      netLabel: "Net VAT position",
    },
  }[direction];

  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {view.eyebrow}
          </p>
          <span
            className={`rounded-none px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${view.tag.cls}`}
          >
            {view.tag.text}
          </span>
        </div>
        <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
          {money(netVat)}
        </p>
        <p className="mt-2.5 text-sm text-muted">{view.sub}</p>
        <div className="mt-4">
          <ProportionBar
            segments={[
              {
                label: `VAT received ${money(received)}`,
                value: received,
                className: "bg-navy-900",
              },
              {
                label: `VAT paid ${money(paid)}`,
                value: paid,
                className: "bg-primary-500",
              },
            ]}
          />
        </div>
      </div>
      <dl className="divide-y divide-line">
        <div className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <LegendDot className="bg-navy-900" />
            <span className="text-sm text-ink-body">
              VAT received on sales (output: T1)
            </span>
          </div>
          <span className="text-sm font-medium text-ink tabular-nums">
            {money(received)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <LegendDot className="bg-primary-500" />
            <span className="text-sm text-ink-body">
              VAT paid on purchases (input: T2)
            </span>
          </div>
          <span className="text-sm font-medium text-ink tabular-nums">{money(paid)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4 bg-surface-muted px-5 py-3.5 sm:px-6">
          <span className="text-sm font-semibold text-ink">{view.netLabel}</span>
          <span className="font-display text-sm font-semibold text-ink tabular-nums">
            {money(netVat)}
          </span>
        </div>
      </dl>
      <p className="border-t border-line px-5 py-3 text-xs leading-5 text-muted sm:px-6">
        Mirrors the VAT3 return: T1 VAT on sales, T2 VAT on purchases; only the
        difference changes hands with Revenue.
      </p>
    </div>
  );
}

/* ---------- registration thresholds ---------- */

function ThresholdsCard({ thresholds }: { thresholds: VatThresholds }) {
  return (
    <div className="mt-5 border border-line bg-surface p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        VAT registration thresholds
      </h3>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-body">
        <span>
          Goods:{" "}
          <span className="font-semibold text-ink">{eur0(thresholds.goods)}</span>
        </span>
        <span>
          Services:{" "}
          <span className="font-semibold text-ink">{eur0(thresholds.services)}</span>
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">
        Turnover limits in any 12-month period, in force since {thresholds.since}.
        You must register once turnover exceeds, or is likely to exceed, the limit
        for your activity.
      </p>
    </div>
  );
}

/* ---------- calculator ---------- */

export function IrelandVatCalculator({ config }: { config: VatConfig }) {
  const { rates, thresholds } = config;
  const [side, setSide] = useState<Side>("received");
  const [salesAmount, setSalesAmount] = useState(0);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [salesCategory, setSalesCategory] = useState<string>(
    VAT_CATEGORIES[0].label,
  );
  // null → mirror the sales category; a value → user has set it independently.
  const [purchaseCategoryOverride, setPurchaseCategoryOverride] = useState<
    string | null
  >(null);
  const purchaseCategory = purchaseCategoryOverride ?? salesCategory;
  const purchaseMirrored = purchaseCategoryOverride === null;

  const salesRate = getVatRate(keyOf(salesCategory), rates);
  const purchaseRate = getVatRate(keyOf(purchaseCategory), rates);

  // Sales entered net (you set prices before VAT); purchases entered gross
  // (supplier invoices show the total you actually paid).
  const sales = addVat(salesAmount, salesRate.percent);
  const purchases = removeVat(purchaseAmount, purchaseRate.percent);
  // received = output VAT (T1); paid = input VAT (T2).
  const pos = vatPosition(sales.vat, purchases.vat);

  const received = side === "received";

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* inputs: tabbed by side */}
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-primary-500 bg-surface-muted px-4 py-3 text-xs leading-5 text-ink-body">
          <span className="font-semibold text-ink">How VAT settles.</span> Fill both
          tabs: the VAT you <span className="font-medium text-ink">receive</span> on
          sales and the VAT you <span className="font-medium text-ink">pay</span> on
          purchases. The result on the right nets them into what&rsquo;s payable to,
          or receivable from, Revenue.
        </div>

        {/* side tabs */}
        <div>
          <div
            role="tablist"
            aria-label="VAT side"
            className="flex gap-1.5 rounded-none border border-line bg-surface-muted p-1"
          >
            {(["received", "paid"] as Side[]).map((s) => {
              const active = side === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSide(s)}
                  className={`flex-1 cursor-pointer rounded-none px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${
                    active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {s === "received" ? "VAT received (sales)" : "VAT paid (purchases)"}
                </button>
              );
            })}
          </div>

          {/* active panel */}
          <div
            role="tabpanel"
            className="mt-4 border border-line bg-surface p-4 sm:p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <LegendDot className={received ? "bg-navy-900" : "bg-primary-500"} />
                <h3 className="text-sm font-semibold text-ink">
                  {received ? "VAT received on sales" : "VAT paid on purchases"}
                </h3>
              </div>
              <span
                className={`rounded-none px-2 py-0.5 font-display text-xs font-semibold tabular-nums text-white ${
                  received ? "bg-navy-900" : "bg-primary-500"
                }`}
              >
                {(received ? salesRate : purchaseRate).percent}%
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              {received
                ? "VAT you charge customers: owed to Revenue (output VAT)."
                : "VAT you pay suppliers: reclaimable from Revenue (input VAT)."}
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {received ? (
                <CategorySelect
                  label="What you sell"
                  value={salesCategory}
                  onChange={setSalesCategory}
                  rates={rates}
                  hint={
                    <>
                      {salesRate.label.split(": ")[0]} rate: {salesRate.applies}.
                      {salesRate.note && <span className="block">{salesRate.note}</span>}
                    </>
                  }
                />
              ) : (
                <CategorySelect
                  label="What you buy"
                  value={purchaseCategory}
                  onChange={setPurchaseCategoryOverride}
                  rates={rates}
                  hint={
                    <>
                      {purchaseRate.label.split(": ")[0]} rate: {purchaseRate.applies}.
                      {purchaseRate.note && (
                        <span className="block">{purchaseRate.note}</span>
                      )}
                      <span className="mt-0.5 block text-muted">
                        {purchaseMirrored
                          ? "Mirrors what you sell: change if you buy at a different rate."
                          : "Set independently. "}
                        {!purchaseMirrored && (
                          <button
                            type="button"
                            onClick={() => setPurchaseCategoryOverride(null)}
                            className="font-medium text-primary-500 underline-offset-2 hover:underline"
                          >
                            Match what you sell
                          </button>
                        )}
                      </span>
                    </>
                  }
                />
              )}

              {received ? (
                <CurrencyField
                  label="Sales for the period (excluding VAT)"
                  value={salesAmount}
                  onChange={setSalesAmount}
                  hint="Everything you invoiced before VAT: a year, a quarter or one VAT period."
                />
              ) : (
                <CurrencyField
                  label="Purchases for the period (including VAT)"
                  value={purchaseAmount}
                  onChange={setPurchaseAmount}
                  hint="Supplier invoice totals you actually paid, VAT included."
                />
              )}
            </div>

            <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
              {received ? (
                sales.gross > 0 ? (
                  <>
                    VAT received:{" "}
                    <span className="font-medium text-ink">{money(sales.vat)}</span>, and
                    customers pay {money(sales.gross)} gross.
                  </>
                ) : (
                  "Enter your sales to see the VAT you receive."
                )
              ) : purchases.gross > 0 ? (
                <>
                  VAT paid:{" "}
                  <span className="font-medium text-ink">{money(purchases.vat)}</span>,
                  on a net cost of {money(purchases.net)}.
                </>
              ) : (
                "Enter your purchases to see the VAT you pay."
              )}
            </p>
          </div>
        </div>

        {/* both-sides recap, so switching tabs never hides a figure */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border border-line bg-surface-muted px-4 py-3 text-xs text-ink-body">
          <span>
            VAT received:{" "}
            <span className="font-semibold text-ink tabular-nums">{money(sales.vat)}</span>
          </span>
          <span>
            VAT paid:{" "}
            <span className="font-semibold text-ink tabular-nums">
              {money(purchases.vat)}
            </span>
          </span>
        </div>
      </div>

      {/* result: computed verdict */}
      <div className="flex flex-col">
        <VerdictCard pos={pos} />
        <ThresholdsCard thresholds={thresholds} />
        <ResultDisclaimer asOf={VAT_LAST_REVIEWED} sourceUrl={VAT_SOURCE_URL} />
      </div>
    </div>
  );
}
