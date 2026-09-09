/* ──────────────────────────────────────────────────────────────────────────
   Ireland investment options engine.
   Pure functions + a static option snapshot: no React, no I/O, so the UI
   (ireland-investment-planner.tsx) and the tests share one auditable source.

   The data is the "Options Comparison" tab of the €500,000 research workbook
   (prepared 28 August 2026), reproduced field for field: sector, risk band,
   gross return range, tax treatment, effective tax rate, liquidity, minimum
   and cap. Every figure is sourced; see SOURCES at the foot of this file.

   Two things this deliberately is NOT:
   - It is not advice. It compares the Irish TAX TREATMENT and net return of
     option types. It does not know the user's circumstances and must never be
     presented as a personal recommendation.
   - It is not a forecast. Deposit, State Savings and bond yields are
     contractual and quoted as such. Everything else is a long-run illustrative
     RANGE, and real outcomes can be negative.

   Rates move (State Savings changed on 30 Aug 2026, exit tax fell to 38% on
   1 Jan 2026). Update DATA_AS_OF whenever a figure below changes.
   ────────────────────────────────────────────────────────────────────────── */

export const DATA_AS_OF = "28 August 2026";

/* ---------- Irish tax constants (2026) ---------- */

export const TAX = {
  /** Deposit Interest Retention Tax. Unchanged since 2013. */
  dirt: 0.33,
  /** Exit tax on funds/ETFs/life policies. Cut from 41% on 1 Jan 2026. */
  exit: 0.38,
  /** Capital gains tax. */
  cgt: 0.33,
  /** Annual CGT personal exemption, per person, does not carry forward. */
  cgtExemption: 1270,
  /** Revised Entrepreneur Relief: lifetime limit raised to €1.5m in 2026. */
  entrepreneurRelief: 0.1,
  /** Angel Investor Relief (18% via a partnership). */
  angelRelief: 0.16,
  /** Dividend withholding tax, creditable against income tax. */
  dwt: 0.25,
  /** Pension Standard Fund Threshold for 2026. */
  standardFundThreshold: 2_200_000,
  /** Earnings cap for relief on your OWN pension contributions. */
  pensionEarningsCap: 115_000,
  /** Levy on money paid into Irish unit-linked life policies. */
  lifeAssuranceLevy: 0.01,
} as const;

/** Age-related ceiling on relievable personal pension contributions, as a
    percentage of earnings capped at TAX.pensionEarningsCap. */
export const PENSION_AGE_BANDS: { maxAge: number; label: string; percent: number }[] = [
  { maxAge: 29, label: "Under 30", percent: 0.15 },
  { maxAge: 39, label: "30 – 39", percent: 0.2 },
  { maxAge: 49, label: "40 – 49", percent: 0.25 },
  { maxAge: 54, label: "50 – 54", percent: 0.3 },
  { maxAge: 59, label: "55 – 59", percent: 0.35 },
  { maxAge: Infinity, label: "60 and over", percent: 0.4 },
];

export function pensionAgePercent(age: number): number {
  return (
    PENSION_AGE_BANDS.find((band) => age <= band.maxAge)?.percent ??
    PENSION_AGE_BANDS[PENSION_AGE_BANDS.length - 1].percent
  );
}

/** Relief ceiling on the investor's own contributions for one tax year. */
export function maxPersonalPensionContribution(age: number, salary: number): number {
  return Math.min(salary, TAX.pensionEarningsCap) * pensionAgePercent(age);
}

/* ---------- horizons ---------- */

export type Horizon = "short" | "medium" | "long";

/** `projectionYears` is the term the net-return projection is compounded over,
    and `maxLockYears` is the longest lock-up that still fits the horizon. */
export const HORIZONS: {
  value: Horizon;
  label: string;
  blurb: string;
  maxLockYears: number;
  projectionYears: number;
}[] = [
  {
    value: "short",
    label: "0–3 years",
    blurb: "Money you may need soon. Capital security matters more than return.",
    maxLockYears: 3,
    projectionYears: 3,
  },
  {
    value: "medium",
    label: "3–10 years",
    blurb: "A known goal at a known date. Some volatility is survivable.",
    maxLockYears: 10,
    projectionYears: 10,
  },
  {
    value: "long",
    label: "10 years plus",
    blurb: "No fixed call on the money. The tax wrapper matters most here.",
    maxLockYears: Infinity,
    projectionYears: 20,
  },
];

export const HORIZON_BY_VALUE: Record<Horizon, (typeof HORIZONS)[number]> = {
  short: HORIZONS[0],
  medium: HORIZONS[1],
  long: HORIZONS[2],
};

/* ---------- risk ---------- */

export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export const RISK_LEVELS: { value: RiskLevel; label: string; blurb: string }[] = [
  { value: 1, label: "None", blurb: "Capital must not fall. Guaranteed products only." },
  { value: 2, label: "Very low", blurb: "Small price movement acceptable; no capital risk sought." },
  { value: 3, label: "Moderate", blurb: "Accepts market movement for a real return above inflation." },
  { value: 4, label: "High", blurb: "Accepts double-digit falls in bad years for long-run growth." },
  { value: 5, label: "Very high", blurb: "Accepts illiquidity and a real chance of total loss on part of it." },
];

/* ---------- options ---------- */

export type Sector =
  | "state"
  | "state-subsidised"
  | "public-exposure"
  | "member-owned"
  | "private";

export const SECTOR_LABELS: Record<Sector, string> = {
  state: "Public / State",
  "state-subsidised": "Public / State-subsidised",
  "public-exposure": "Public exposure",
  "member-owned": "Member-owned",
  private: "Private",
};

export type SectorFilter = "all" | "state" | "private";

/** Sectors counted as State-backed by the sector filter. A credit union is
    member-owned, not State-backed, so it sits on the private side. */
const STATE_SECTORS: Sector[] = ["state", "state-subsidised"];

export type OptionCategory =
  | "cash"
  | "fixed-term"
  | "regular-saving"
  | "government-bonds"
  | "bonds"
  | "pension"
  | "equities"
  | "property"
  | "private-equity"
  | "private-credit"
  | "business"
  | "alternatives";

export const CATEGORY_LABELS: Record<OptionCategory, string> = {
  cash: "Cash",
  "fixed-term": "Cash / fixed term",
  "regular-saving": "Regular saving",
  "government-bonds": "Government bonds",
  bonds: "Bonds",
  pension: "Pension",
  equities: "Equities",
  property: "Property",
  "private-equity": "Private equity",
  "private-credit": "Private credit",
  business: "Business",
  alternatives: "Alternatives",
};

/** How the capital is protected. `state-full` is the Irish State guarantee with
    no €100,000 ceiling; `dgs` is the €100,000-per-person-per-institution
    Deposit Guarantee Scheme. */
export type Guarantee = "state-full" | "dgs" | "none";

/** Deposit Guarantee Scheme cover, per person, per institution. */
export const DGS_LIMIT = 100_000;

export interface InvestmentOption {
  id: string;
  name: string;
  sector: Sector;
  category: OptionCategory;
  /** 1 = cash, 5 = venture. Matches the workbook's Risk 1-5 column. */
  risk: RiskLevel;
  /** Long-run illustrative range, or the contractual rate where both are equal. */
  grossLow: number;
  grossHigh: number;
  /** Plain-English tax treatment, shown verbatim in the results. */
  taxTreatment: string;
  /** Fixed or blended effective rate, or `"marginal"` to follow the investor's
      own total marginal rate on income. */
  effectiveTax: number | "marginal";
  liquidity: string;
  /** Shortest realistic commitment in years, which drives the horizon filter.
      Pension wrappers carry 15 rather than 10: they are locked to age 50–60+,
      and the planner does not ask for age, so they stay out of the 3–10 year
      answers rather than topping a list for money that is needed sooner. */
  lockYears: number;
  minimum: number;
  /** Cap as written in the workbook, for display. */
  cap: string;
  /** Numeric per-person ceiling where there is a hard one. */
  capAmount?: number;
  guarantee: Guarantee;
  /** False where the product cannot absorb a lump sum. */
  lumpSum: boolean;
  note: string;
  /** Where an Irish resident actually goes for this: the provider itself
      where there is one, otherwise the Irish regulator or Revenue. Every URL
      here was checked to resolve; if one starts 404ing, fix or drop it rather
      than shipping a dead button. Categories covering several providers point
      at the CCPC comparison rather than singling one out, which would read as
      a recommendation. */
  link: { label: string; url: string };
}

/* The 32 options, in the workbook's own order: State-backed first, then
   member-owned, then private, roughly ascending in risk within each block. */
export const INVESTMENT_OPTIONS: InvestmentOption[] = [
  {
    id: "posb-deposit",
    name: "Post Office Savings Bank deposit account",
    sector: "state",
    category: "cash",
    risk: 1,
    grossLow: 0.0125,
    grossHigh: 0.0125,
    taxTreatment: "DIRT 33%",
    effectiveTax: TAX.dirt,
    liquidity: "Instant access",
    lockYears: 0,
    minimum: 50,
    cap: "€250,000 per person",
    capAmount: 250_000,
    guarantee: "state-full",
    lumpSum: true,
    note: "State-guaranteed in full, not just to €100,000. The rate rose from 0.75% to 1.25% on 30 August 2026. The best home for a large emergency buffer that has to be completely safe.",
    link: {
      label: "Open on State Savings",
      url: "https://www.statesavings.ie/our-products/book-based-deposit-account",
    },
  },
  {
    id: "state-savings-3yr-bond",
    name: "State Savings: 3-Year Savings Bond",
    sector: "state",
    category: "fixed-term",
    risk: 1,
    grossLow: 0.0196,
    grossHigh: 0.0196,
    taxTreatment: "Tax-free",
    effectiveTax: 0,
    liquidity: "3 years (7 days' notice, forfeits interest)",
    lockYears: 3,
    minimum: 50,
    cap: "€120,000 per person / €240,000 joint",
    capAmount: 120_000,
    guarantee: "state-full",
    lumpSum: true,
    note: "The AER rose 0.64 points to 1.96% on 30 August 2026. Tax-free, so worth 2.93% gross-equivalent to a DIRT payer, and State-guaranteed in full.",
    link: {
      label: "Open on State Savings",
      url: "https://www.statesavings.ie/our-products/3-year-savings-bonds",
    },
  },
  {
    id: "state-savings-5yr-cert",
    name: "State Savings: 5-Year Savings Certificate",
    sector: "state",
    category: "fixed-term",
    risk: 1,
    grossLow: 0.0229,
    grossHigh: 0.0229,
    taxTreatment: "Tax-free",
    effectiveTax: 0,
    liquidity: "5 years",
    lockYears: 5,
    minimum: 50,
    cap: "€120,000 per person / €240,000 joint",
    capAmount: 120_000,
    guarantee: "state-full",
    lumpSum: true,
    note: "The AER rose 0.55 points to 2.29%. Gross-equivalent 3.42% for a DIRT payer, which beats every taxed Irish deposit, with a full State guarantee and no €100,000 ceiling.",
    link: {
      label: "Open on State Savings",
      url: "https://www.statesavings.ie/our-products/5-year-savings-certificates",
    },
  },
  {
    id: "state-savings-10yr-solidarity",
    name: "State Savings: 10-Year National Solidarity Bond",
    sector: "state",
    category: "fixed-term",
    risk: 1,
    grossLow: 0.0266,
    grossHigh: 0.0266,
    taxTreatment: "Tax-free",
    effectiveTax: 0,
    liquidity: "10 years",
    lockYears: 10,
    minimum: 50,
    cap: "€120,000 per person / €240,000 joint",
    capAmount: 120_000,
    guarantee: "state-full",
    lumpSum: true,
    note: "The AER rose 0.65 points to 2.66%, the best guaranteed tax-free rate available in Ireland and a 3.97% gross-equivalent. It locks capital for a decade, and an early exit forfeits future interest.",
    link: {
      label: "Open on State Savings",
      url: "https://www.statesavings.ie/our-products/10-year-national-solidarity-bond",
    },
  },
  {
    id: "state-savings-instalment",
    name: "State Savings: 6-Year Instalment Savings",
    sector: "state",
    category: "regular-saving",
    risk: 1,
    grossLow: 0.0233,
    grossHigh: 0.0233,
    taxTreatment: "Tax-free",
    effectiveTax: 0,
    liquidity: "6 years",
    lockYears: 6,
    minimum: 25,
    cap: "€1,000 per month",
    guarantee: "state-full",
    lumpSum: false,
    note: "AER 2.33%, but monthly only at €25–€1,000, so it cannot absorb a lump sum. Useful for redirecting surplus income rather than for placing capital.",
    link: {
      label: "Open on State Savings",
      url: "https://www.statesavings.ie/our-products/instalment-savings",
    },
  },
  {
    id: "prize-bonds",
    name: "Prize Bonds",
    sector: "state",
    category: "cash",
    risk: 1,
    grossLow: 0,
    grossHigh: 0.015,
    taxTreatment: "Prizes tax-free",
    effectiveTax: 0,
    liquidity: "90-day minimum, then on demand",
    lockYears: 0,
    minimum: 25,
    cap: "€250,000 per person / €500,000 joint",
    capAmount: 250_000,
    guarantee: "state-full",
    lumpSum: true,
    note: "The prize fund rate rose from 1.00% to 1.50% on 1 September 2026, but there is no guaranteed return at all and most holders get well below 1.5%. Capital is fully State-guaranteed. Treat it as safe cash with a lottery ticket attached, not as an investment.",
    link: {
      label: "Open Prize Bonds",
      url: "https://www.prizebonds.ie/",
    },
  },
  {
    id: "irish-govt-bonds",
    name: "Irish Government bonds: direct (10-year)",
    sector: "state",
    category: "government-bonds",
    risk: 2,
    grossLow: 0.032,
    grossHigh: 0.0339,
    taxTreatment: "Coupon at marginal rate; gains CGT-exempt",
    effectiveTax: "marginal",
    liquidity: "Daily, through a broker",
    lockYears: 0,
    minimum: 1_000,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Yielding 3.39% at 27 August 2026, forecast near 3.20% in twelve months. Gains on Irish government bonds are CGT-exempt, but the coupon is taxed at up to 52%, so a low-coupon bond bought below par is far more tax-efficient than a high-coupon one. The price falls if rates rise.",
    link: {
      label: "NTMA: Irish government bonds",
      url: "https://www.ntma.ie/business-areas/funding-and-debt-management",
    },
  },
  {
    id: "euro-bond-etf",
    name: "Euro sovereign / aggregate bond UCITS ETF",
    sector: "public-exposure",
    category: "government-bonds",
    risk: 2,
    grossLow: 0.025,
    grossHigh: 0.033,
    taxTreatment: "Exit tax 38% + 8-year deemed disposal",
    effectiveTax: TAX.exit,
    liquidity: "Daily",
    lockYears: 0,
    minimum: 1,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Diversified across euro-area issuers and convenient, but the fund wrapper drags it to 38% and the deemed-disposal clock applies. Direct bonds or a pension give the same exposure more efficiently.",
    link: {
      label: "How ETFs are taxed in Ireland",
      url: "https://etf.ie/tax/",
    },
  },
  {
    id: "executive-pension",
    name: "Executive pension / occupational scheme",
    sector: "state-subsidised",
    category: "pension",
    risk: 3,
    grossLow: 0.045,
    grossHigh: 0.07,
    taxTreatment: "Relief in, gross roll-up, taxed on the way out",
    effectiveTax: 0,
    liquidity: "Locked to age 50–60+",
    lockYears: 15,
    minimum: 0,
    cap: "Standard Fund Threshold €2.2m (2026)",
    capAmount: TAX.standardFundThreshold,
    guarantee: "none",
    lumpSum: true,
    note: "Company contributions get corporation tax relief, are not a benefit-in-kind, and carry no employer PRSA cap when funded on a salary-and-service basis. No exit tax, no deemed disposal and no CGT inside the fund.",
    link: {
      label: "Revenue: pensions",
      url: "https://www.revenue.ie/en/jobs-and-pensions/pension/index.aspx",
    },
  },
  {
    id: "employer-prsa",
    name: "PRSA: employer-funded by your company",
    sector: "state-subsidised",
    category: "pension",
    risk: 3,
    grossLow: 0.045,
    grossHigh: 0.07,
    taxTreatment: "Relief in, gross roll-up, taxed on the way out",
    effectiveTax: 0,
    liquidity: "Locked to age 50–60+",
    lockYears: 15,
    minimum: 0,
    cap: "100% of salary per year",
    guarantee: "none",
    lumpSum: true,
    note: "Since January 2025 employer PRSA contributions are capped at 100% of that year's salary; anything above that is a benefit-in-kind. On a €100,000 salary that moves €100,000 a year into a gross-roll-up wrapper, deductible for the company.",
    link: {
      label: "Revenue: pensions",
      url: "https://www.revenue.ie/en/jobs-and-pensions/pension/index.aspx",
    },
  },
  {
    id: "avcs",
    name: "AVCs to your existing employer scheme",
    sector: "state-subsidised",
    category: "pension",
    risk: 3,
    grossLow: 0.045,
    grossHigh: 0.07,
    taxTreatment: "Relief at marginal rate; gross roll-up",
    effectiveTax: 0,
    liquidity: "Locked to retirement",
    lockYears: 15,
    minimum: 0,
    cap: "Age percentage of €115,000",
    guarantee: "none",
    lumpSum: true,
    note: "Your own contributions get income tax relief at 40% but no USC or PRSI relief. At 42 that is 25% of €115,000, so €28,750 a year, smaller than the company route but stacking on top of it.",
    link: {
      label: "Revenue: pensions",
      url: "https://www.revenue.ie/en/jobs-and-pensions/pension/index.aspx",
    },
  },
  {
    id: "arf",
    name: "Approved Retirement Fund (post-retirement)",
    sector: "state-subsidised",
    category: "pension",
    risk: 3,
    grossLow: 0.04,
    grossHigh: 0.07,
    taxTreatment: "Gross roll-up; drawdowns taxed",
    effectiveTax: 0,
    liquidity: "From retirement",
    lockYears: 15,
    minimum: 0,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Relevant at retirement rather than now. It grows free of exit tax, DIRT and CGT, and you are taxed only on withdrawals, with a mandatory imputed drawdown from age 61.",
    link: {
      label: "Revenue: pensions",
      url: "https://www.revenue.ie/en/jobs-and-pensions/pension/index.aspx",
    },
  },
  {
    id: "credit-union",
    name: "Credit union share / deposit account",
    sector: "member-owned",
    category: "cash",
    risk: 1,
    grossLow: 0.0005,
    grossHigh: 0.01,
    taxTreatment: "DIRT 33%",
    effectiveTax: TAX.dirt,
    liquidity: "Instant to 30 days",
    lockYears: 0,
    minimum: 5,
    cap: "Often €40,000–€100,000",
    guarantee: "dgs",
    lumpSum: true,
    note: "Community-owned and covered by the deposit guarantee, but dividends are decided retrospectively and most pay well under 1%. Many cap large balances, so it is not a home for six figures.",
    link: {
      label: "Find your credit union",
      url: "https://www.creditunion.ie/",
    },
  },
  {
    id: "pillar-bank-deposit",
    name: "Irish pillar bank deposit (AIB / Bank of Ireland / PTSB)",
    sector: "private",
    category: "cash",
    risk: 1,
    grossLow: 0.0075,
    grossHigh: 0.0125,
    taxTreatment: "DIRT 33%",
    effectiveTax: TAX.dirt,
    liquidity: "7–32 days' notice",
    lockYears: 0,
    minimum: 1,
    cap: "€100,000 deposit guarantee cover",
    guarantee: "dgs",
    lumpSum: true,
    note: "AIB 0.75% on 7-day notice, Bank of Ireland 1.00% on 31-day, PTSB 1.25% on 32-day. Several instant-access alternatives pay more than these notice accounts.",
    link: {
      label: "CCPC: compare savings accounts",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/compare-savings-accounts",
    },
  },
  {
    id: "neobank-cash",
    name: "Instant-access neobank / broker cash (Trading 212, Trade Republic, Revolut)",
    sector: "private",
    category: "cash",
    risk: 1,
    grossLow: 0.02,
    grossHigh: 0.035,
    taxTreatment: "DIRT 33%, self-declared",
    effectiveTax: TAX.dirt,
    liquidity: "Instant",
    lockYears: 0,
    minimum: 1,
    cap: "€100,000 deposit guarantee per institution",
    guarantee: "dgs",
    lumpSum: true,
    note: "Trading 212 3.50%, Trade Republic 3.04%, Bunq 3.01%, Revolut 2.00%. Interest is paid gross, so you must declare it and pay the 33% yourself. Check whether the cash is held as a deposit (guaranteed) or in a money market fund (not guaranteed, and taxed as a fund).",
    link: {
      label: "CCPC: compare savings accounts",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/compare-savings-accounts",
    },
  },
  {
    id: "raisin-fixed-term",
    name: "EU fixed-term deposit through Raisin",
    sector: "private",
    category: "fixed-term",
    risk: 1,
    grossLow: 0.0309,
    grossHigh: 0.034,
    taxTreatment: "DIRT 33%, self-declared",
    effectiveTax: TAX.dirt,
    liquidity: "Locked for the term",
    lockYears: 1,
    minimum: 1,
    cap: "€100,000 deposit guarantee per bank",
    guarantee: "dgs",
    lumpSum: true,
    note: "Best 1-year 3.40% (BluOr, Latvia), 2-year 3.39%, 3-year 3.14% (Haitong, Spain), 5-year 3.25% (Avarda, Sweden). The curve is flat, so there is nothing to gain by locking long. Each bank carries its own national €100,000 guarantee. Net of DIRT, 3.40% becomes 2.28%, less than the tax-free 10-year Solidarity Bond.",
    link: {
      label: "CCPC: saving in other EU countries",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/saving-in-other-eu-countries",
    },
  },
  {
    id: "iseq-shares",
    name: "Irish listed equities: direct shares (ISEQ)",
    sector: "private",
    category: "equities",
    risk: 4,
    grossLow: 0.05,
    grossHigh: 0.09,
    taxTreatment: "CGT 33% on gains; dividends at marginal rate",
    effectiveTax: 0.43,
    liquidity: "Daily",
    lockYears: 0,
    minimum: 500,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "The ISEQ 20 returned 32.97% in 2025 but 7.64% annualised over five years, on a 3.66% dividend yield. It is extremely concentrated: AIB 20%, Ryanair 19%, Bank of Ireland 18%, Kingspan 14% and Kerry 14% are 85% of the index. Direct shares avoid the 38% exit tax and the deemed disposal, and allow loss offset.",
    link: {
      label: "Euronext Dublin",
      url: "https://live.euronext.com/en/markets/dublin",
    },
  },
  {
    id: "global-equity-etf",
    name: "Global equity UCITS ETF (all-world accumulating)",
    sector: "private",
    category: "equities",
    risk: 4,
    grossLow: 0.05,
    grossHigh: 0.08,
    taxTreatment: "Exit tax 38% + 8-year deemed disposal",
    effectiveTax: TAX.exit,
    liquidity: "Daily",
    lockYears: 0,
    minimum: 1,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "The cheapest, most diversified equity exposure there is, and the worst treated by Irish tax: 38% on gains, no annual exemption, no loss offset, no step-up on death, and a forced tax event every eight years. Excellent inside a pension, painful outside one.",
    link: {
      label: "How ETFs are taxed in Ireland",
      url: "https://etf.ie/tax/",
    },
  },
  {
    id: "investment-trusts",
    name: "Investment trusts (UK / EU closed-ended)",
    sector: "private",
    category: "equities",
    risk: 4,
    grossLow: 0.05,
    grossHigh: 0.08,
    taxTreatment: "CGT 33%; no deemed disposal",
    effectiveTax: TAX.cgt,
    liquidity: "Daily",
    lockYears: 0,
    minimum: 500,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Closed-ended companies listed on an exchange, so generally taxed as shares at 33% CGT with losses offsettable and no eight-year event, the standard Irish workaround for the fund regime. Confirm the specific trust's treatment with a tax adviser, as the offshore-fund rules can catch some structures.",
    link: {
      label: "CCPC: investments",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/investments",
    },
  },
  {
    id: "unit-linked-life-fund",
    name: "Unit-linked life assurance fund (Zurich, Irish Life, New Ireland)",
    sector: "private",
    category: "equities",
    risk: 3,
    grossLow: 0.04,
    grossHigh: 0.07,
    taxTreatment: "Exit tax 38% + 1% levy",
    effectiveTax: TAX.exit,
    liquidity: "Usually a 5-year exit penalty",
    lockYears: 5,
    minimum: 5_000,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Simple, advised and well diversified, but expensive. A 1% government levy on the way in, typically 1%–1.75% annual management charge, plus 38% exit tax and the deemed disposal. Convenience has a real price here.",
    link: {
      label: "CCPC: investments",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/investments",
    },
  },
  {
    id: "corporate-bonds",
    name: "Corporate / bank senior bonds",
    sector: "private",
    category: "bonds",
    risk: 3,
    grossLow: 0.035,
    grossHigh: 0.048,
    taxTreatment: "Coupon at marginal rate; CGT 33% on gains",
    effectiveTax: "marginal",
    liquidity: "Daily but thin",
    lockYears: 0,
    minimum: 1_000,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "A higher yield than sovereigns in exchange for credit risk. The coupon is taxed at up to 52%, which makes these poor value outside a pension and much better inside one.",
    link: {
      label: "CCPC: investments",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/investments",
    },
  },
  {
    id: "ires-reit",
    name: "IRES REIT / listed property",
    sector: "private",
    category: "property",
    risk: 4,
    grossLow: 0.04,
    grossHigh: 0.08,
    taxTreatment: "Distributions at marginal rate (25% DWT credit); CGT 33%",
    effectiveTax: 0.48,
    liquidity: "Daily",
    lockYears: 0,
    minimum: 500,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "The last listed Irish REIT and the country's largest private landlord, at roughly 3,900 units. Property exposure with daily liquidity and no management, but REIT distributions are taxed as income at up to 52%, not at CGT rates. It has traded at a discount to net asset value and has been running buybacks.",
    link: {
      label: "IRES REIT",
      url: "https://www.iresreit.ie/",
    },
  },
  {
    id: "buy-to-let",
    name: "Direct buy-to-let residential property",
    sector: "private",
    category: "property",
    risk: 4,
    grossLow: 0.04,
    grossHigh: 0.077,
    taxTreatment: "Rent at marginal rate up to 52%; CGT 33% on sale",
    effectiveTax: 0.5,
    liquidity: "Months to sell",
    lockYears: 5,
    minimum: 150_000,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Gross yields ran about 7.7% nationally, 8.33% in Cork and 7.0% in Dublin in Q2 2026. After marginal-rate tax on the rent, RTB registration, the rent-cap rules from March 2026, insurance, management, voids and maintenance, net yields typically land near 2.5%–4%. Illiquid and highly concentrated, and it cannot be done properly for less than about €150,000 plus costs.",
    link: {
      label: "RTB: landlord obligations",
      url: "https://www.rtb.ie/",
    },
  },
  {
    id: "pension-property",
    name: "Property inside a self-administered pension",
    sector: "private",
    category: "property",
    risk: 4,
    grossLow: 0.05,
    grossHigh: 0.08,
    taxTreatment: "No tax on rent or gains inside the fund",
    effectiveTax: 0,
    liquidity: "Locked to retirement",
    lockYears: 15,
    minimum: 200_000,
    cap: "Standard Fund Threshold €2.2m",
    capAmount: TAX.standardFundThreshold,
    guarantee: "none",
    lumpSum: true,
    note: "The same property bought through a self-administered pension pays no income tax on the rent and no CGT on the sale inside the fund. The rules are strict (no personal use, arm's-length tenants only, limited borrowing), but this is where direct property makes far more sense in Ireland.",
    link: {
      label: "Revenue: pensions",
      url: "https://www.revenue.ie/en/jobs-and-pensions/pension/index.aspx",
    },
  },
  {
    id: "eiis-fund",
    name: "EIIS fund (Davy/BDO, Goodbody, Cantor, BVP, Quintas, Elkstone)",
    sector: "private",
    category: "private-equity",
    risk: 5,
    grossLow: 0.05,
    grossHigh: 0.15,
    taxTreatment: "30–50% income tax relief; gains CGT 33%",
    effectiveTax: TAX.cgt,
    liquidity: "4 years minimum",
    lockYears: 4,
    minimum: 5_000,
    cap: "€1,000,000 per year",
    capAmount: 1_000_000,
    guarantee: "none",
    lumpSum: true,
    note: "Relief of 30% through a fund, up to 50% for pre-market companies, in the year of investment. Minimums run from €5,000 (Davy/BDO) to €25,000 (Cantor, Quintas), with fees around 3% upfront plus exit and performance fees. Funds typically open in October–November and close on 31 December. There is a real risk of total capital loss, and relief can be clawed back if the company fails to qualify.",
    link: {
      label: "Revenue: EII scheme",
      url: "https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/investment/relief-corporate/employment-investment-incentive.aspx",
    },
  },
  {
    id: "angel-investment",
    name: "Angel investment in innovative start-ups",
    sector: "private",
    category: "private-equity",
    risk: 5,
    grossLow: -0.1,
    grossHigh: 0.2,
    taxTreatment: "CGT 16% (Angel Investor Relief)",
    effectiveTax: TAX.angelRelief,
    liquidity: "3 years minimum",
    lockYears: 3,
    minimum: 20_000,
    cap: "€10m lifetime relieved gain",
    guarantee: "none",
    lumpSum: true,
    note: "16% CGT instead of 33% on certified innovative companies under seven years old. Minimum €20,000, or €10,000 if you take 5% or more, and the relieved gain is capped at twice your investment. The shares must be held before 31 December 2026, which is a live deadline. Most start-ups fail, so invest only what you can lose entirely.",
    link: {
      label: "Revenue: CGT and reliefs",
      url: "https://www.revenue.ie/en/gains-gifts-and-inheritance/index.aspx",
    },
  },
  {
    id: "private-equity-fund",
    name: "Private equity / venture capital fund",
    sector: "private",
    category: "private-equity",
    risk: 5,
    grossLow: 0.08,
    grossHigh: 0.15,
    taxTreatment: "Depends on structure: usually CGT 33%",
    effectiveTax: TAX.cgt,
    liquidity: "8–12 year lock-up",
    lockYears: 8,
    minimum: 100_000,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Irish and pan-European funds. Illiquid for a decade, capital called in tranches, 2%-and-20% fee structures common, and the dispersion between top and bottom managers is enormous. Suitable only for money you will not need, and generally only for a modest slice of it.",
    link: {
      label: "CCPC: investments",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/investments",
    },
  },
  {
    id: "private-credit",
    name: "Private credit / direct lending fund",
    sector: "private",
    category: "private-credit",
    risk: 4,
    grossLow: 0.07,
    grossHigh: 0.1,
    taxTreatment: "Income at marginal rate up to 52%",
    effectiveTax: "marginal",
    liquidity: "3–7 years, limited redemption",
    lockYears: 3,
    minimum: 50_000,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Higher headline yields than bonds, but the return arrives as income taxed at up to 52% outside a pension, which halves it. Credit losses rise sharply in a downturn.",
    link: {
      label: "CCPC: investments",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/investments",
    },
  },
  {
    id: "p2p-property-lending",
    name: "Peer-to-peer property lending (e.g. Property Bridges)",
    sector: "private",
    category: "private-credit",
    risk: 5,
    grossLow: 0.07,
    grossHigh: 0.09,
    taxTreatment: "Income at marginal rate up to 52%",
    effectiveTax: "marginal",
    liquidity: "6–24 months per loan",
    lockYears: 2,
    minimum: 500,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Short-dated loans to Irish developers. The headline rates are attractive, but there is no deposit guarantee, no capital protection, borrower default is a real risk, and the interest is taxed as income at up to 52%. Small allocation only.",
    link: {
      label: "Property Bridges",
      url: "https://www.propertybridges.com/",
    },
  },
  {
    id: "own-company",
    name: "Investing in or expanding your own company",
    sector: "private",
    category: "business",
    risk: 5,
    grossLow: 0,
    grossHigh: 0.3,
    taxTreatment: "CGT 10% on exit (Entrepreneur Relief)",
    effectiveTax: TAX.entrepreneurRelief,
    liquidity: "Years",
    lockYears: 5,
    minimum: 0,
    cap: "€1.5m lifetime (from 2026)",
    capAmount: 1_500_000,
    guarantee: "none",
    lumpSum: true,
    note: "Often the highest-return use of capital for an owner-manager, and Revised Entrepreneur Relief now shelters €1.5m of lifetime gains at 10% CGT, raised from €1m on 1 January 2026. The catch is concentration: your income, your capital and your pension would all depend on one business.",
    link: {
      label: "Revenue: CGT and reliefs",
      url: "https://www.revenue.ie/en/gains-gifts-and-inheritance/index.aspx",
    },
  },
  {
    id: "gold-etc",
    name: "Gold / commodity ETC",
    sector: "private",
    category: "alternatives",
    risk: 4,
    grossLow: 0.02,
    grossHigh: 0.06,
    taxTreatment: "Usually CGT 33% (physically-backed ETCs)",
    effectiveTax: TAX.cgt,
    liquidity: "Daily",
    lockYears: 0,
    minimum: 500,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "A diversifier rather than an income producer: it pays nothing, and its real return over long periods is close to inflation. Physically-backed ETCs are typically outside the fund regime, so CGT rather than exit tax, but confirm the specific product.",
    link: {
      label: "CCPC: investments",
      url: "https://www.ccpc.ie/manage-your-money/saving-and-investments/investments",
    },
  },
  {
    id: "crypto",
    name: "Crypto assets",
    sector: "private",
    category: "alternatives",
    risk: 5,
    grossLow: -0.3,
    grossHigh: 0.3,
    taxTreatment: "CGT 33%; no deemed disposal",
    effectiveTax: TAX.cgt,
    liquidity: "Instant",
    lockYears: 0,
    minimum: 100,
    cap: "None",
    guarantee: "none",
    lumpSum: true,
    note: "Taxed as an asset at 33% CGT, with every trade a disposal and full record-keeping required. Extreme volatility, no cash flow and no intrinsic yield. If it is included at all, keep it to a percentage you would shrug off losing entirely.",
    link: {
      label: "Revenue: crypto-assets",
      url: "https://www.revenue.ie/en/companies-and-charities/financial-services/cryptocurrencies/index.aspx",
    },
  },
];

/* ---------- maths ---------- */

/** Midpoint of the gross range. For a range as wide as crypto's this is not a
    forecast of anything; the workbook is explicit about that. */
export function grossMid(option: InvestmentOption): number {
  return (option.grossLow + option.grossHigh) / 2;
}

/** Effective tax rate applied to the return, resolving `"marginal"`. */
export function effectiveTaxRate(option: InvestmentOption, marginalRate: number): number {
  return option.effectiveTax === "marginal" ? marginalRate : option.effectiveTax;
}

/** Return after Irish tax. Matches the workbook: gross mid × (1 − effective tax). */
export function netReturn(option: InvestmentOption, marginalRate: number): number {
  return grossMid(option) * (1 - effectiveTaxRate(option, marginalRate));
}

/** Compound `amount` at `rate` for `years`. */
export function projectValue(amount: number, rate: number, years: number): number {
  return amount * Math.pow(1 + rate, years);
}

/* ---------- the planner ---------- */

export interface PlannerInputs {
  amount: number;
  horizon: Horizon;
  risk: RiskLevel;
  /** Total marginal rate on income: income tax plus USC and PRSI. */
  marginalRate: number;
  sector: SectorFilter;
  /** Restrict to State-guaranteed or deposit-guaranteed capital. */
  guaranteedOnly: boolean;
  inflation: number;
}

export const DEFAULT_INPUTS: PlannerInputs = {
  amount: 100_000,
  horizon: "medium",
  risk: 3,
  marginalRate: 0.52,
  sector: "all",
  guaranteedOnly: false,
  inflation: 0.02,
};

export interface OptionResult {
  option: InvestmentOption;
  grossMid: number;
  effectiveTaxRate: number;
  netReturn: number;
  /** Net of tax and of inflation. */
  realReturn: number;
  projectedValue: number;
  gain: number;
  /** Per-option cautions: caps exceeded, guarantee ceilings, lump-sum fit. */
  flags: string[];
}

export interface PlanResult {
  years: number;
  results: OptionResult[];
  /** Options ruled out, with the reason, so nothing disappears silently. */
  excluded: { option: InvestmentOption; reason: string }[];
  warnings: string[];
}

function optionFlags(option: InvestmentOption, inputs: PlannerInputs): string[] {
  const flags: string[] = [];
  if (option.capAmount !== undefined && inputs.amount > option.capAmount) {
    flags.push(
      `Caps at ${formatEuro(option.capAmount)}: the balance needs another home.`,
    );
  }
  if (option.guarantee === "dgs" && inputs.amount > DGS_LIMIT) {
    flags.push(
      `Deposit guarantee covers ${formatEuro(DGS_LIMIT)} per person per institution, so spread this across several.`,
    );
  }
  if (!option.lumpSum) {
    flags.push("Cannot absorb a lump sum: it takes monthly contributions only.");
  }
  if (option.category === "pension") {
    flags.push(
      "Shown before the tax relief going in and the income tax on the way out, which broadly offset.",
    );
  }
  return flags;
}

/**
 * Narrow the option list to those that fit the horizon, risk appetite, sector
 * and amount, then rank by return after Irish tax.
 *
 * Ranking by net return is the workbook's own comparison, not a
 * recommendation: it says nothing about whether an option suits the investor,
 * and a higher-ranked line is frequently the riskier one.
 */
export function planInvestments(inputs: PlannerInputs): PlanResult {
  const horizon = HORIZON_BY_VALUE[inputs.horizon];
  const years = horizon.projectionYears;

  const results: OptionResult[] = [];
  const excluded: { option: InvestmentOption; reason: string }[] = [];

  for (const option of INVESTMENT_OPTIONS) {
    if (option.lockYears > horizon.maxLockYears) {
      excluded.push({
        option,
        reason: `Locks capital for ${option.lockYears} years, beyond a ${horizon.label.toLowerCase()} horizon.`,
      });
      continue;
    }
    if (option.risk > inputs.risk) {
      excluded.push({ option, reason: `Risk ${option.risk} of 5 is above the level you set.` });
      continue;
    }
    if (inputs.sector === "state" && !STATE_SECTORS.includes(option.sector)) {
      excluded.push({ option, reason: "Not State-backed." });
      continue;
    }
    if (inputs.sector === "private" && STATE_SECTORS.includes(option.sector)) {
      excluded.push({ option, reason: "State-backed rather than private-sector." });
      continue;
    }
    if (inputs.guaranteedOnly && option.guarantee === "none") {
      excluded.push({ option, reason: "Carries no capital guarantee." });
      continue;
    }
    if (inputs.amount < option.minimum) {
      excluded.push({
        option,
        reason: `Needs at least ${formatEuro(option.minimum)}.`,
      });
      continue;
    }

    const net = netReturn(option, inputs.marginalRate);
    const projectedValue = projectValue(inputs.amount, net, years);
    results.push({
      option,
      grossMid: grossMid(option),
      effectiveTaxRate: effectiveTaxRate(option, inputs.marginalRate),
      netReturn: net,
      realReturn: net - inputs.inflation,
      projectedValue,
      gain: projectedValue - inputs.amount,
      flags: optionFlags(option, inputs),
    });
  }

  /* Highest net return first; ties broken by the lower risk, then by name so
     the order is stable across renders. */
  results.sort(
    (a, b) =>
      b.netReturn - a.netReturn ||
      a.option.risk - b.option.risk ||
      a.option.name.localeCompare(b.option.name),
  );

  return { years, results, excluded, warnings: planWarnings(inputs, results) };
}

function planWarnings(inputs: PlannerInputs, results: OptionResult[]): string[] {
  const warnings: string[] = [];

  if (inputs.amount > DGS_LIMIT && results.some((r) => r.option.guarantee === "dgs")) {
    warnings.push(
      `Deposit guarantee cover is ${formatEuro(DGS_LIMIT)} per person per institution. A cash balance above that has to be spread across institutions, or held somewhere carrying the full State guarantee.`,
    );
  }
  if (results.every((r) => r.realReturn <= 0) && results.length > 0) {
    warnings.push(
      `Every option that fits these answers returns less than ${(inputs.inflation * 100).toFixed(0)}% inflation after tax, so the money loses purchasing power. Widening the horizon or the risk level is what changes that.`,
    );
  }
  if (results.length === 0) {
    warnings.push(
      "Nothing matches these answers. Try a longer horizon, a higher risk level, or turn off the capital-guarantee filter.",
    );
  }
  if (inputs.risk >= 5) {
    warnings.push(
      "Risk level 5 includes options where losing the entire amount is a realistic outcome, and several cannot be sold for years.",
    );
  }
  return warnings;
}

/* ---------- formatting shared by the UI and the tests ---------- */

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatPercent(rate: number, dp = 2): string {
  return `${(rate * 100).toFixed(dp)}%`;
}

/** Gross rate a taxed product would need to match a tax-free one. */
export function grossEquivalent(taxFreeRate: number, taxRate: number): number {
  return taxRate >= 1 ? Infinity : taxFreeRate / (1 - taxRate);
}

/* ---------- sources ---------- */

export const SOURCES: { topic: string; source: string; url: string }[] = [
  {
    topic: "State Savings rates from 30 August 2026",
    source: "NTMA: NTMA to increase Ireland State Savings rates",
    url: "https://www.ntma.ie/news/ntma-to-increase-ireland-state-savings-rates",
  },
  {
    topic: "State Savings holding limits",
    source: "Ireland State Savings: overall holding limits",
    url: "https://www.statesavings.ie/help-support/help-articles/is-there-any-limit-on-my-overall-holding-of-state",
  },
  {
    topic: "Fixed-term deposit rates, August 2026",
    source: "Ask About Wealth: best fixed-term deposits",
    url: "https://askaboutwealth.ie/best-fixed-term-deposits-ireland",
  },
  {
    topic: "Instant-access savings rates, August 2026",
    source: "Ask About Wealth: best savings accounts",
    url: "https://askaboutwealth.ie/best-savings-accounts-ireland",
  },
  {
    topic: "Irish 10-year government bond yield",
    source: "Trading Economics: Ireland government bond yield",
    url: "https://tradingeconomics.com/ireland/government-bond-yield",
  },
  {
    topic: "Exit tax cut to 38%, deemed disposal",
    source: "etf.ie: ETF Tax Ireland 2026",
    url: "https://etf.ie/tax/",
  },
  {
    topic: "DIRT rate 2026",
    source: "FinanceTool.ie: DIRT guide 2026",
    url: "https://financetool.ie/guides/deposit-interest-retention-tax-2026",
  },
  {
    topic: "Budget 2026: Entrepreneur Relief, exit tax",
    source: "Saffery Ireland: Budget 2026 at a glance",
    url: "https://www.saffery.com/ie/insights/articles/budget-2026-at-a-glance/",
  },
  {
    topic: "Standard Fund Threshold, tax-free lump sum",
    source: "Chartered Capital: Budget 2026 investment & pension changes",
    url: "https://charteredcapital.ie/budget-2026-investment-pension-changes/",
  },
  {
    topic: "Pension age-band limits, €115,000 cap",
    source: "Revenue: tax relief limits on pension contributions",
    url: "https://www.revenue.ie/en/jobs-and-pensions/pension/relief/tax-relief-limits.aspx",
  },
  {
    topic: "Employer PRSA 100% cap; PRSA vs executive pension",
    source: "Money Maximising: PRSA vs company pension 2026",
    url: "https://mmadvisors.ie/prsa-vs-company-pension-ireland-directors-2026/",
  },
  {
    topic: "EIIS rates, limits and conditions",
    source: "Irish Tax Hub: EII Scheme 2026",
    url: "https://www.irishtaxhub.ie/blog/irelands-employment-and-investment-incentive-eii-scheme",
  },
  {
    topic: "Angel Investor Relief",
    source: "Beauchamps: Angel Investor Relief",
    url: "https://www.beauchamps.ie/publications/17159",
  },
  {
    topic: "Rental yields Q2 2026",
    source: "PensionProperty.ie: Irish rental market report Q2 2026",
    url: "https://www.pensionproperty.ie/news/irish-rental-market-report-q2-2026-rents-yields-regional-trends",
  },
  {
    topic: "ISEQ 20 returns, yield and constituents",
    source: "Euronext: ISEQ 20 index factsheet (31 March 2026)",
    url: "https://live.euronext.com/sites/default/files/documentation/index-fact-sheets/ISEQ_20_Index_Factsheet.pdf",
  },
  {
    topic: "Personal Investment Account (2027)",
    source: "Raisin: Irish Personal Investment Account guide",
    url: "https://www.raisin.com/en-ie/press/irelands-new-savings-scheme-what-is-it/",
  },
];
