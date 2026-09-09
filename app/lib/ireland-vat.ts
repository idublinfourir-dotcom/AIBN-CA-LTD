/* ──────────────────────────────────────────────────────────────────────────
   Ireland VAT calculator: Add VAT (net → gross), Remove VAT (gross → net)
   and the net VAT position (output VAT on sales − input VAT on purchases →
   payable to / receivable from Revenue, as on the VAT3 return).

   PURE FUNCTIONS ONLY, no React, no I/O, so every figure is unit-testable.
   The editable rates + thresholds live in VAT_CONFIG_DEFAULT below: the single
   code source of truth (VAT_RATES / VAT_THRESHOLDS are derived from it). It is
   the fallback used when no DB row exists; when an admin saves, the loader
   passes the stored config to the component. The compute fns already take the
   rate as an argument, so they are unchanged. VAT_CATEGORIES (the taxonomy of
   what maps to which rate) stays in code.

   Sources (verified per line):
   - VAT rates:      revenue.ie/en/vat/vat-rates
   - Registration thresholds:
                     revenue.ie/en/vat/who-must-register-for-vat/vat-thresholds

   Figures are ESTIMATES for guidance only, not tax advice. Confirm with a
   qualified adviser or revenue.ie before acting on any number.
   ────────────────────────────────────────────────────────────────────────── */

/** When the rates/thresholds below were last checked against Revenue. */
export const VAT_LAST_REVIEWED = "July 2026";
export const VAT_SOURCE_URL = "https://www.revenue.ie/en/vat/vat-rates/index.aspx";

/* ---------- rates ---------- */

export type VatRateKey =
  | "standard"
  | "reduced"
  | "second-reduced"
  | "livestock"
  | "zero";

export interface VatRate {
  key: VatRateKey;
  /** Nominal percentage, e.g. 23 for 23%. */
  percent: number;
  /** Human label for the selector. */
  label: string;
  /** What this rate applies to. */
  applies: string;
  /** Optional footnote shown beside the rate. */
  note?: string;
}

export interface VatThresholds {
  /** Goods registration threshold in euro. */
  goods: number;
  /** Services registration threshold in euro. */
  services: number;
  /** Human "in force since" label. */
  since: string;
}

export interface VatConfig {
  rates: VatRate[];
  thresholds: VatThresholds;
}

/** Editable rates + thresholds: the code fallback AND the shape the admin edits.
    Single source: VAT_RATES / VAT_THRESHOLDS below are derived from this. */
export const VAT_CONFIG_DEFAULT: VatConfig = {
  // Order = selector order.
  rates: [
    {
      key: "standard",
      percent: 23,
      label: "Standard: 23%",
      applies: "Most goods and services",
    },
    {
      key: "reduced",
      percent: 13.5,
      label: "Reduced: 13.5%",
      applies: "Fuel, electricity, construction, general repairs",
    },
    {
      key: "second-reduced",
      percent: 9,
      label: "Second reduced: 9%",
      applies: "Food & catering, hairdressing, newspapers, sporting facilities",
      note: "Food & catering and hairdressing moved from 13.5% to 9% on 1 July 2026.",
    },
    {
      key: "livestock",
      percent: 4.8,
      label: "Livestock: 4.8%",
      applies: "Livestock, greyhounds and the hire of horses",
    },
    {
      key: "zero",
      percent: 0,
      label: "Zero: 0%",
      applies: "Most food, children's clothing/footwear, oral medicines, exports",
    },
  ],
  // A rise to €100k / €50k has been discussed but is NOT law: do not use it.
  thresholds: { goods: 85_000, services: 42_500, since: "1 January 2025" },
};

/* One source of truth for the rate table. Order = selector order. */
export const VAT_RATES: VatRate[] = VAT_CONFIG_DEFAULT.rates;

/** The five statutory rate keys: every stored config must carry each exactly once. */
export const REQUIRED_VAT_KEYS: VatRateKey[] = [
  "standard",
  "reduced",
  "second-reduced",
  "livestock",
  "zero",
];

const finiteNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Resolve a rate by key against a rate table (defaults to the code table). */
export function getVatRate(key: VatRateKey, rates: VatRate[] = VAT_RATES): VatRate {
  const rate = rates.find((r) => r.key === key);
  if (!rate) throw new Error(`Unknown VAT rate: ${key}`);
  return rate;
}

/** Validate a stored config blob; null on any bad/missing/out-of-range field.
    Requires all five statutory rate keys present exactly once (categories map
    to them). Pure, so both vat-data.ts and the tests can use it without the DB
    layer. */
export function parseVatConfig(raw: unknown): VatConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.rates)) return null;

  const rates: VatRate[] = [];
  for (const item of o.rates) {
    if (typeof item !== "object" || item === null) return null;
    const r = item as Record<string, unknown>;
    const percent = finiteNum(r.percent);
    if (typeof r.key !== "string" || !REQUIRED_VAT_KEYS.includes(r.key as VatRateKey)) return null;
    if (percent === null || percent < 0 || percent > 100) return null;
    if (typeof r.label !== "string" || r.label.trim() === "") return null;
    if (typeof r.applies !== "string" || r.applies.trim() === "") return null;
    const rate: VatRate = { key: r.key as VatRateKey, percent, label: r.label, applies: r.applies };
    if (typeof r.note === "string" && r.note.trim() !== "") rate.note = r.note;
    rates.push(rate);
  }
  const keys = rates.map((r) => r.key);
  if (keys.length !== REQUIRED_VAT_KEYS.length) return null;
  for (const k of REQUIRED_VAT_KEYS) if (!keys.includes(k)) return null;

  const t = o.thresholds;
  if (typeof t !== "object" || t === null) return null;
  const to = t as Record<string, unknown>;
  const goods = finiteNum(to.goods);
  const services = finiteNum(to.services);
  if (goods === null || goods < 0) return null;
  if (services === null || services < 0) return null;
  if (typeof to.since !== "string" || to.since.trim() === "") return null;

  return { rates, thresholds: { goods, services, since: to.since } };
}

/* ---------- goods/service categories → rate ----------
   So the user picks WHAT they're selling and the correct rate resolves
   automatically, instead of having to know the percentage. Grouped by rate in
   the UI. Classification can be nuanced: the on-result disclaimer covers the
   edge cases. Source: revenue.ie/en/vat/vat-rates (rate database). */

export interface VatCategory {
  label: string;
  rateKey: VatRateKey;
}

export const VAT_CATEGORIES: VatCategory[] = [
  // Standard: 23%
  { label: "General goods & services (standard rate)", rateKey: "standard" },
  { label: "Adult clothing & footwear", rateKey: "standard" },
  { label: "Electrical goods & appliances", rateKey: "standard" },
  { label: "Alcohol, soft drinks & bottled water", rateKey: "standard" },
  { label: "Professional services (legal, accountancy, consultancy)", rateKey: "standard" },
  { label: "Furniture, cosmetics & most retail goods", rateKey: "standard" },
  // Reduced: 13.5%
  { label: "Electricity & gas (domestic energy)", rateKey: "reduced" },
  { label: "Home heating oil & solid fuel", rateKey: "reduced" },
  { label: "Building & construction services", rateKey: "reduced" },
  { label: "General repairs & maintenance", rateKey: "reduced" },
  { label: "Hotel & holiday accommodation", rateKey: "reduced" },
  // Second reduced: 9%
  { label: "Restaurant & catering meals", rateKey: "second-reduced" },
  { label: "Hot takeaway food & hot drinks", rateKey: "second-reduced" },
  { label: "Hairdressing", rateKey: "second-reduced" },
  { label: "Newspapers, periodicals & e-books", rateKey: "second-reduced" },
  { label: "Sporting facilities & gym membership", rateKey: "second-reduced" },
  { label: "Cinema, theatre & concert admission", rateKey: "second-reduced" },
  // Livestock: 4.8%
  { label: "Livestock (cattle, sheep, pigs)", rateKey: "livestock" },
  { label: "Greyhounds & hire of horses", rateKey: "livestock" },
  // Zero: 0%
  { label: "Groceries & most food and drink", rateKey: "zero" },
  { label: "Children's clothing & footwear", rateKey: "zero" },
  { label: "Oral medicines", rateKey: "zero" },
  { label: "Printed books", rateKey: "zero" },
  { label: "Exports outside the EU", rateKey: "zero" },
];

/* ---------- registration thresholds (since 1 Jan 2025) ---------- */

/* Derived from VAT_CONFIG_DEFAULT: one source, no drift. */
export const VAT_THRESHOLDS: VatThresholds = VAT_CONFIG_DEFAULT.thresholds;

/* ---------- maths ---------- */

/** Round to 2 decimal places, absorbing binary-float error (e.g. 1.005 → 1.01). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface VatBreakdown {
  /** Amount excluding VAT. */
  net: number;
  /** VAT amount. */
  vat: number;
  /** Amount including VAT. */
  gross: number;
  /** Rate used, e.g. 23. */
  percent: number;
}

/**
 * Add VAT to a net (VAT-exclusive) amount.
 *   vat   = net × rate
 *   gross = net + vat   ← derived by addition so the three always reconcile.
 */
export function addVat(net: number, percent: number): VatBreakdown {
  const n = round2(Math.max(0, net));
  const vat = round2(n * (percent / 100));
  const gross = round2(n + vat);
  return { net: n, vat, gross, percent };
}

/**
 * Remove VAT from a gross (VAT-inclusive) amount.
 *   net = gross ÷ (1 + rate)
 *   vat = gross − net   ← derived by subtraction so net + vat === gross exactly.
 */
export function removeVat(gross: number, percent: number): VatBreakdown {
  const g = round2(Math.max(0, gross));
  const net = round2(g / (1 + percent / 100));
  const vat = round2(g - net);
  return { net, vat, gross: g, percent };
}

/* ---------- net VAT position (the VAT3 return) ----------
   A registered business charges VAT on its sales (output VAT: owed to
   Revenue) and pays VAT on its purchases (input VAT: reclaimable). At the
   end of the period the two are netted on the VAT3 return:

     T1  VAT on sales      (output)
     T2  VAT on purchases  (input)
     T3  = T1 − T2  if positive  → VAT PAYABLE to Revenue
     T4  = T2 − T1  if positive  → VAT REPAYABLE by Revenue

   e.g. paid €2.5M input VAT but only charged €2M output VAT
        → €0.5M receivable from Revenue. */

export type VatDirection = "payable" | "receivable" | "balanced";

export interface VatPosition {
  /** T1: VAT charged on sales, owed to Revenue. */
  outputVat: number;
  /** T2: VAT paid on purchases, reclaimable. */
  inputVat: number;
  /** |T1 − T2|: the amount that changes hands. */
  netVat: number;
  /** Which way the net amount flows. */
  direction: VatDirection;
}

/**
 * Net two VAT totals into the period position.
 *   netVat = |outputVat − inputVat|, direction from the sign.
 */
export function vatPosition(outputVat: number, inputVat: number): VatPosition {
  const t1 = round2(Math.max(0, outputVat));
  const t2 = round2(Math.max(0, inputVat));
  const diff = round2(t1 - t2);
  return {
    outputVat: t1,
    inputVat: t2,
    netVat: Math.abs(diff),
    direction: diff > 0 ? "payable" : diff < 0 ? "receivable" : "balanced",
  };
}
