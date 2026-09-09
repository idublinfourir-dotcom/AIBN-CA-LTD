/* ──────────────────────────────────────────────────────────────────────────
   Ireland mortgage repayments engine: mortgages.ie-style comparison.
   Pure functions + a static lender-rate snapshot: no React, no I/O.
   The UI (ireland-mortgage-calculator.tsx) imports these so the figures
   stay in one auditable place.

   Live products and policy come from Postgres (mortgage_products /
   mortgage_settings, editable in /admin/mortgage-rates: see
   mortgage-data.ts). LENDER_PRODUCTS and DEFAULT_POLICY below are the
   seed data and the fallback when the DB is unreachable. Monthly
   payments use the standard annuity formula, which reproduces the
   mortgages.ie calculator exactly (e.g. €200,000 @ 3.2% over 30 years
   → €864.93/month).
   ────────────────────────────────────────────────────────────────────────── */

export const RATES_AS_OF = "July 2026";

/* ---------- product / applicant types ---------- */

export type ProductType = "first-time" | "trading-up" | "switch" | "investment";

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "first-time", label: "First Time Buyer" },
  { value: "trading-up", label: "Trading up" },
  { value: "switch", label: "Switch" },
  { value: "investment", label: "Investment Property" },
];

export type RateType =
  | "variable"
  | "fixed-1"
  | "fixed-2"
  | "fixed-3"
  | "fixed-4"
  | "fixed-5"
  | "fixed-7"
  | "fixed-10"
  | "fixed-full";

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  variable: "Variable",
  "fixed-1": "1 Yr Fixed",
  "fixed-2": "2 Yr Fixed",
  "fixed-3": "3 Yr Fixed",
  "fixed-4": "4 Yr Fixed",
  "fixed-5": "5 Yr Fixed",
  "fixed-7": "7 Yr Fixed",
  "fixed-10": "10 Yr Fixed",
  "fixed-full": "Full-term Fixed",
};

/* Tab order on the results screen (mirrors mortgages.ie). */
export const RATE_TYPE_TABS: RateType[] = [
  "variable",
  "fixed-1",
  "fixed-2",
  "fixed-3",
  "fixed-4",
  "fixed-5",
  "fixed-7",
  "fixed-10",
  "fixed-full",
];

/** Years the initial rate is locked for: "fixed-3" → 3, full-term → whole term. */
export function fixedYearsFor(rateType: RateType, termYears: number): number {
  if (rateType === "variable") return 0;
  if (rateType === "fixed-full") return termYears;
  return Math.min(termYears, Number(rateType.slice("fixed-".length)));
}

/* ---------- lender rate snapshot ---------- */

export interface LenderProduct {
  id: string | number;
  lender: string;
  name: string;
  rateType: RateType;
  /** Nominal annual rate, e.g. 3.2 for 3.2%. */
  ratePercent: number;
  /** Annual Percentage Rate of Charge, e.g. 3.9 for 3.9%. */
  aprcPercent: number;
  /** Maximum loan-to-value this rate is available at (0.9 = 90%). */
  maxLtv: number;
  /** Green mortgage: requires an energy-efficient home (BER B3 or better). */
  green?: boolean;
  /** Lender incentive shown as a badge, e.g. "2% cashback". */
  cashback?: string;
  /** Variable rate the loan rolls to when the fixed period ends (e.g. 4.15).
      Absent → the product rate is assumed for the whole term. */
  revertRatePercent?: number;
  /** Structured cashback: % of the loan paid at drawdown (e.g. 2 for 2%). */
  cashbackPercent?: number;
  /** Flat euro cashback (e.g. 5000 for a €5,000 offer). */
  cashbackFlat?: number;
  /** Longer offer description shown in the per-product details view. */
  details?: string;
  /** Which buyer types the product is open to. */
  audience: ProductType[];
}

const OWNER_OCCUPIER: ProductType[] = ["first-time", "trading-up", "switch"];

export const LENDER_PRODUCTS: LenderProduct[] = [
  // ── Green fixed ──
  {
    id: "haven-green-4f",
    lender: "Haven (AIB Group)",
    name: "4 Year Fixed",
    rateType: "fixed-4",
    ratePercent: 3.2,
    aprcPercent: 3.9,
    maxLtv: 0.9,
    green: true,
    revertRatePercent: 3.95,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "aib-green-5f",
    lender: "AIB",
    name: "5 Year Fixed",
    rateType: "fixed-5",
    ratePercent: 3.25,
    aprcPercent: 3.86,
    maxLtv: 0.9,
    green: true,
    revertRatePercent: 3.75,
    audience: OWNER_OCCUPIER,
  },
  // ── Avant Money ──
  {
    id: "avant-full",
    lender: "Avant Money",
    name: "Full-term Fixed",
    rateType: "fixed-full",
    ratePercent: 3.4,
    aprcPercent: 3.48,
    maxLtv: 0.9,
    cashback: "1% cashback",
    cashbackPercent: 1,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "avant-4f",
    lender: "Avant Money",
    name: "4 Year Fixed",
    rateType: "fixed-4",
    ratePercent: 3.4,
    aprcPercent: 3.7,
    maxLtv: 0.9,
    cashback: "2% cashback",
    revertRatePercent: 3.85,
    cashbackPercent: 2,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "avant-3f",
    lender: "Avant Money",
    name: "3 Year Fixed",
    rateType: "fixed-3",
    ratePercent: 3.6,
    aprcPercent: 3.8,
    maxLtv: 0.9,
    revertRatePercent: 3.85,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "avant-7f",
    lender: "Avant Money",
    name: "7 Year Fixed",
    rateType: "fixed-7",
    ratePercent: 3.45,
    aprcPercent: 3.6,
    maxLtv: 0.8,
    revertRatePercent: 3.85,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "avant-10f",
    lender: "Avant Money",
    name: "10 Year Fixed",
    rateType: "fixed-10",
    ratePercent: 3.5,
    aprcPercent: 3.6,
    maxLtv: 0.8,
    revertRatePercent: 3.85,
    audience: OWNER_OCCUPIER,
  },
  // ── Bank of Ireland ──
  {
    id: "boi-2f",
    lender: "Bank of Ireland",
    name: "2 Year Fixed",
    rateType: "fixed-2",
    ratePercent: 3.65,
    aprcPercent: 4.0,
    maxLtv: 0.9,
    cashback: "2% cashback",
    revertRatePercent: 4.15,
    cashbackPercent: 2,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "boi-4f",
    lender: "Bank of Ireland",
    name: "4 Year Fixed",
    rateType: "fixed-4",
    ratePercent: 3.45,
    aprcPercent: 3.9,
    maxLtv: 0.9,
    cashback: "2% cashback",
    revertRatePercent: 4.15,
    cashbackPercent: 2,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "boi-var",
    lender: "Bank of Ireland",
    name: "Standard Variable",
    rateType: "variable",
    ratePercent: 4.15,
    aprcPercent: 4.3,
    maxLtv: 0.9,
    audience: OWNER_OCCUPIER,
  },
  // ── PTSB ──
  {
    id: "ptsb-3f",
    lender: "PTSB",
    name: "3 Year Fixed",
    rateType: "fixed-3",
    ratePercent: 3.7,
    aprcPercent: 4.1,
    maxLtv: 0.9,
    cashback: "2% cashback",
    revertRatePercent: 4.7,
    cashbackPercent: 2,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "ptsb-5f",
    lender: "PTSB",
    name: "5 Year Fixed",
    rateType: "fixed-5",
    ratePercent: 3.6,
    aprcPercent: 4.0,
    maxLtv: 0.9,
    cashback: "2% cashback",
    revertRatePercent: 4.7,
    cashbackPercent: 2,
    audience: OWNER_OCCUPIER,
  },
  // ── AIB / Haven variable ──
  {
    id: "aib-var",
    lender: "AIB",
    name: "Standard Variable",
    rateType: "variable",
    ratePercent: 3.75,
    aprcPercent: 3.9,
    maxLtv: 0.9,
    audience: OWNER_OCCUPIER,
  },
  {
    id: "haven-var",
    lender: "Haven (AIB Group)",
    name: "Variable",
    rateType: "variable",
    ratePercent: 3.95,
    aprcPercent: 4.1,
    maxLtv: 0.9,
    audience: OWNER_OCCUPIER,
  },
  // ── ICS ──
  {
    id: "ics-3f",
    lender: "ICS Mortgages",
    name: "3 Year Fixed",
    rateType: "fixed-3",
    ratePercent: 3.95,
    aprcPercent: 4.2,
    maxLtv: 0.9,
    revertRatePercent: 4.3,
    audience: OWNER_OCCUPIER,
  },
  // ── Buy-to-let / investment ──
  {
    id: "ics-btl-5f",
    lender: "ICS Mortgages",
    name: "Buy-to-Let 5 Year Fixed",
    rateType: "fixed-5",
    ratePercent: 4.55,
    aprcPercent: 4.8,
    maxLtv: 0.7,
    revertRatePercent: 5.0,
    audience: ["investment"],
  },
  {
    id: "avant-btl-var",
    lender: "Avant Money",
    name: "Buy-to-Let Variable",
    rateType: "variable",
    ratePercent: 4.75,
    aprcPercent: 4.9,
    maxLtv: 0.7,
    audience: ["investment"],
  },
  {
    id: "boi-btl-2f",
    lender: "Bank of Ireland",
    name: "Buy-to-Let 2 Year Fixed",
    rateType: "fixed-2",
    ratePercent: 4.65,
    aprcPercent: 4.9,
    maxLtv: 0.7,
    revertRatePercent: 4.95,
    audience: ["investment"],
  },
];

/* ========================================================================== */
/* Maths                                                                       */
/* ========================================================================== */

/** Standard amortising repayment: M = P·r(1+r)^n / ((1+r)^n − 1). */
export function monthlyPayment(
  loan: number,
  ratePercent: number,
  termYears: number,
): number {
  const n = Math.max(1, Math.round(termYears * 12));
  const r = ratePercent / 100 / 12;
  if (r === 0) return loan / n;
  const factor = Math.pow(1 + r, n);
  return (loan * r * factor) / (factor - 1);
}

/** Balance still owed after `months` payments of `monthly` on `loan`. */
function remainingBalance(
  loan: number,
  ratePercent: number,
  monthly: number,
  months: number,
): number {
  const r = ratePercent / 100 / 12;
  if (r === 0) return Math.max(0, loan - monthly * months);
  const factor = Math.pow(1 + r, months);
  return Math.max(0, loan * factor - (monthly * (factor - 1)) / r);
}

/* ---------- Central Bank guardrails (warnings only) ---------- */

/* Policy numbers live in the mortgage_settings DB row so a rule change is an
   admin edit, not a deploy. These defaults double as the fallback when the DB
   is unreachable and as the seed values in db/schema.sql. */
export interface MortgagePolicy {
  ltiFirstTime: number;
  ltiTradingUp: number;
  maxLtvOwner: number;
  maxLtvInvestment: number;
  /** Most lenders require the mortgage to end by this age. */
  maxAgeAtEnd: number;
  /** Longest term lenders offer on a residential (owner-occupier) mortgage. */
  maxTermOwner: number;
  /** Longest term lenders offer on a buy-to-let / investment mortgage. */
  maxTermInvestment: number;
}

export const DEFAULT_POLICY: MortgagePolicy = {
  ltiFirstTime: 4,
  ltiTradingUp: 3.5,
  maxLtvOwner: 0.9,
  maxLtvInvestment: 0.7,
  maxAgeAtEnd: 70,
  maxTermOwner: 35,
  maxTermInvestment: 25,
};

function ltiMultipleFor(policy: MortgagePolicy, type: ProductType): number | null {
  if (type === "first-time") return policy.ltiFirstTime;
  if (type === "trading-up") return policy.ltiTradingUp;
  // Switching an existing loan isn't a new LTI test; BTL isn't income-bound.
  return null;
}

function maxLtvFor(policy: MortgagePolicy, type: ProductType): number {
  return type === "investment" ? policy.maxLtvInvestment : policy.maxLtvOwner;
}

/** Longest available term for the buyer type (owner 35y / investment 25y by default). */
export function maxTermFor(policy: MortgagePolicy, type: ProductType): number {
  return type === "investment" ? policy.maxTermInvestment : policy.maxTermOwner;
}

export interface ComparisonInput {
  productType: ProductType;
  propertyValue: number;
  loanAmount: number;
  termYears: number;
  /** Age next birthday: oldest applicant when joint. */
  age: number;
  /** Combined gross annual income of all applicants. */
  income: number;
  /** Home has a BER of B3 or better: gates green-mortgage rates. */
  berB3Plus?: boolean;
}

export interface RepaymentPhase {
  years: number;
  ratePercent: number;
  monthly: number;
}

export interface ProductQuote {
  product: LenderProduct;
  /** Repayment during the initial (fixed) period. */
  monthly: number;
  totalRepayable: number;
  totalInterest: number;
  /** One phase for single-rate products; two when a fixed rate reverts to variable. */
  phases: RepaymentPhase[];
  /** Euro value of the structured cashback for this loan (0 when none). */
  cashbackValue: number;
}

/* Two-phase quote, matching how lenders illustrate fixed products: the payment
   is set as if the fixed rate ran the whole term; when the fixed period ends,
   the remaining balance re-amortises at the lender's variable (revert) rate.
   E.g. €360,000 over 35y, 2y fixed @ 3.8% reverting to 4.15% →
   €1,551.09/month for 2 years, €1,623.28 for 33, total cost €680,045. */
/* Lender illustrations total the payment rounded to the cent, so we do too:
   this is what makes the totals match published examples exactly. */
const toCent = (n: number) => Math.round(n * 100) / 100;

export function quoteProduct(
  product: LenderProduct,
  loan: number,
  termYears: number,
): ProductQuote {
  const months = Math.max(1, Math.round(termYears * 12));
  const monthly = toCent(monthlyPayment(loan, product.ratePercent, termYears));
  const fixedMonths = Math.round(fixedYearsFor(product.rateType, termYears) * 12);

  let phases: RepaymentPhase[];
  let totalRepayable: number;
  if (
    product.revertRatePercent != null &&
    fixedMonths > 0 &&
    fixedMonths < months
  ) {
    const fixedYears = fixedMonths / 12;
    const balance = remainingBalance(loan, product.ratePercent, monthly, fixedMonths);
    const revertMonthly = toCent(
      monthlyPayment(balance, product.revertRatePercent, termYears - fixedYears),
    );
    phases = [
      { years: fixedYears, ratePercent: product.ratePercent, monthly },
      {
        years: termYears - fixedYears,
        ratePercent: product.revertRatePercent,
        monthly: revertMonthly,
      },
    ];
    totalRepayable = monthly * fixedMonths + revertMonthly * (months - fixedMonths);
  } else {
    phases = [{ years: termYears, ratePercent: product.ratePercent, monthly }];
    totalRepayable = monthly * months;
  }

  const cashbackValue =
    ((product.cashbackPercent ?? 0) / 100) * loan + (product.cashbackFlat ?? 0);

  return {
    product,
    monthly,
    totalRepayable,
    totalInterest: Math.max(0, totalRepayable - loan),
    phases,
    cashbackValue,
  };
}

export interface ComparisonResult {
  ltv: number;
  quotes: ProductQuote[];
  /** Rate types with at least one quote: drives the filter tabs. */
  availableRateTypes: RateType[];
  warnings: string[];
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

export function compareProducts(
  input: ComparisonInput,
  products: LenderProduct[] = LENDER_PRODUCTS,
  policy: MortgagePolicy = DEFAULT_POLICY,
): ComparisonResult {
  const value = Math.max(0, input.propertyValue);
  const loan = Math.max(0, input.loanAmount);
  const ltv = value > 0 ? loan / value : 0;

  const warnings: string[] = [];

  const maxLtv = maxLtvFor(policy, input.productType);
  if (ltv > maxLtv + 1e-9) {
    warnings.push(
      `Your loan is ${new Intl.NumberFormat("en-IE", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(ltv)} of the property value: above the ${Math.round(
        maxLtv * 100,
      )}% Central Bank loan-to-value limit. You would need a deposit of at least ${fmtEur(
        value * (1 - maxLtv),
      )}.`,
    );
  }

  const ltiMultiple = ltiMultipleFor(policy, input.productType);
  if (ltiMultiple !== null && input.income > 0 && loan > ltiMultiple * input.income) {
    warnings.push(
      `A ${fmtEur(loan)} loan is above the ${ltiMultiple}× loan-to-income limit for your income (max ${fmtEur(
        ltiMultiple * input.income,
      )}). Lenders may still approve under an exemption.`,
    );
  }

  const maxTerm = maxTermFor(policy, input.productType);
  if (input.termYears > maxTerm) {
    warnings.push(
      `A ${input.termYears}-year term is longer than the ${maxTerm}-year maximum lenders offer on ${
        input.productType === "investment" ? "an investment" : "a residential"
      } mortgage.`,
    );
  }

  if (input.age > 0 && input.age + input.termYears > policy.maxAgeAtEnd) {
    warnings.push(
      `A ${input.termYears}-year term would run past age ${policy.maxAgeAtEnd}. Most lenders cap the term so the mortgage ends by ${policy.maxAgeAtEnd}, around ${Math.max(
        5,
        policy.maxAgeAtEnd - input.age,
      )} years in your case.`,
    );
  }

  // Products the buyer qualifies for: right audience, the rate's LTV band
  // covers this loan, and green rates only for BER B3+ homes. If the loan
  // already breaches the Central Bank LTV cap we still quote 90%-band
  // products so the buyer sees indicative repayments.
  const effectiveLtv = Math.min(ltv, maxLtv);
  const quotes: ProductQuote[] = products.filter(
    (p) =>
      p.audience.includes(input.productType) &&
      effectiveLtv <= p.maxLtv + 1e-9 &&
      (!p.green || input.berB3Plus !== false),
  )
    .map((product) => quoteProduct(product, loan, input.termYears))
    .sort((a, b) => a.monthly - b.monthly);

  const availableRateTypes = RATE_TYPE_TABS.filter((t) =>
    quotes.some((q) => q.product.rateType === t),
  );

  return { ltv, quotes, availableRateTypes, warnings };
}
