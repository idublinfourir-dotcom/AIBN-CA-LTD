/* ──────────────────────────────────────────────────────────────────────────
   Ireland R&D (Research & Development) Corporation Tax Credit calculator.

   PURE FUNCTIONS ONLY, no React, no I/O, so every figure is unit-testable.
   The editable rates/thresholds live in RD_CONFIG_DEFAULT below: the single
   code source of truth (fallback + default arg of computeRdCredit). RD_CREDIT
   is derived from it plus two PROSE-ONLY fields (effectiveBenefitPercent,
   effectiveFrom) that are never used in the maths and stay in code.

   HOW THE CREDIT WORKS
   - A company gets a credit of 35% of its qualifying R&D expenditure. This is
     ON TOP of the normal deduction for the same spend, so combined with the
     12.5% trading deduction the effective benefit is ~47.5% of qualifying spend.
   - The credit is paid in THREE annual instalments (it is NOT netted against
     the CT liability first; the company elects offset or cash repayment):
       1st instalment = the GREATER of (a) 50% of the credit, or
                        (b) the first-year threshold (€87,500), capped at the
                        credit. → a claim ≤ €87,500 is paid in full in year one.
       2nd instalment = 3/5 (60%) of the balance after the first instalment.
       3rd instalment = the remaining balance.
     For large claims this resolves to a fixed 50% / 30% / 20% split.

   Sources (verified July 2026):
   - Rate 35% + €87,500 first-year threshold (Budget 2026 / Finance Act 2025,
     accounting periods commencing on or after 1 January 2026):
       revenue.ie/en/companies-and-charities/reliefs-and-exemptions/research-and-development-rd-tax-credit
       taxsummaries.pwc.com/ireland/corporate/tax-credits-and-incentives
   - Three-instalment mechanism (greater of 50% / threshold; 3/5 of balance):
       revenue.ie R&D Corporation Tax Credit guidelines (Part 29-02-03)

   Figures are ESTIMATES for guidance only, not tax advice. Whether spend
   qualifies (the science test, eligible cost categories) is the hard part and
   must be assessed case by case. Confirm with a qualified adviser or revenue.ie.

   ── NOT MODELLED (deliberate: do NOT silently fold in) ──
   - The science/qualification test (what actually counts as R&D).
   - Subcontractor / third-level outsourcing limits (own R&D + up to 15% / €100k).
   - Capital vs revenue split, plant & equipment apportionment, grants netting.
   - Key Employee Reward (surrendering credit to staff).
   ────────────────────────────────────────────────────────────────────────── */

/** When the rate/threshold below were last checked against Revenue. */
export const RD_LAST_REVIEWED = "July 2026";
export const RD_SOURCE_URL =
  "https://www.revenue.ie/en/companies-and-charities/reliefs-and-exemptions/research-and-development-rd-tax-credit/index.aspx";

/* ---------- config (single source of truth) ---------- */

export interface RdConfig {
  /** Credit as a % of qualifying R&D expenditure. */
  ratePercent: number;
  /** Standard trading deduction the same spend also attracts. */
  tradingDeductionPercent: number;
  /** Max of the credit payable in year one before the instalment split kicks in. */
  firstYearThresholdEur: number;
  /** Fraction of the post-first-instalment balance paid as the 2nd instalment. */
  secondInstalmentFraction: number;
}

/** Editable fields (drive the maths): the code fallback AND the default arg of
    computeRdCredit. */
export const RD_CONFIG_DEFAULT: RdConfig = {
  ratePercent: 35,
  tradingDeductionPercent: 12.5,
  firstYearThresholdEur: 87_500,
  secondInstalmentFraction: 0.6,
};

/* The editable numbers + two PROSE-ONLY fields that are never used in the maths
   (combinedBenefit is DERIVED from credit + deduction, not effectiveBenefitPercent;
   effectiveFrom is a display date). Derived from RD_CONFIG_DEFAULT, no drift. */
export const RD_CREDIT = {
  ...RD_CONFIG_DEFAULT,
  /** Credit + deduction headline: ~47.5% effective benefit (prose only). */
  effectiveBenefitPercent: 47.5,
  /** When these figures take effect (prose only). */
  effectiveFrom: "accounting periods commencing on or after 1 January 2026",
};

const finiteNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Validate a stored config blob; null on any bad/missing/out-of-range field.
    Pure, so both rd-data.ts and the tests can use it without the DB layer. */
export function parseRdConfig(raw: unknown): RdConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const rate = finiteNum(o.ratePercent);
  const trading = finiteNum(o.tradingDeductionPercent);
  const threshold = finiteNum(o.firstYearThresholdEur);
  const frac = finiteNum(o.secondInstalmentFraction);
  if (rate === null || trading === null || threshold === null || frac === null) return null;
  if (rate < 0 || rate > 100) return null;
  if (trading < 0 || trading > 100) return null;
  if (threshold < 0) return null;
  if (frac < 0 || frac > 1) return null;
  return {
    ratePercent: rate,
    tradingDeductionPercent: trading,
    firstYearThresholdEur: threshold,
    secondInstalmentFraction: frac,
  };
}

/** Shown beside the qualifying-spend input. */
export const RD_QUALIFYING_NOTE =
  "Qualifying cost for one accounting period, net of any grant funding: science-tested staff, materials, overheads and plant apportioned to the work, plus outsourced R&D within limits. Grant-aided spend doesn't qualify. Eligibility is assessed case by case: enter only spend you're confident is eligible.";

/* ---------- maths ---------- */

/** Round to 2 decimal places, absorbing binary-float error. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface RdInstalments {
  /** Paid in year one: greater of 50% or the threshold (capped at the credit). */
  year1: number;
  /** Paid in year two: 3/5 of the balance after year one. */
  year2: number;
  /** Paid in year three: the remaining balance. */
  year3: number;
}

export interface RdCreditResult {
  /** Gross R&D expenditure entered (clamped ≥ 0, rounded). */
  grossExpenditure: number;
  /** Grant funding entered, clamped to 0…grossExpenditure: grant-aided spend
      doesn't qualify, so it's netted off. */
  grantFunding: number;
  /** Qualifying (net) spend the credit is based on = gross − grant. */
  qualifyingSpend: number;
  /** Rate applied, e.g. 35. */
  ratePercent: number;
  /** The R&D tax credit = spend × rate. */
  credit: number;
  /** Value of the separate 12.5% trading deduction on the same spend (context). */
  tradingDeductionValue: number;
  /** Credit + trading deduction ≈ 47.5% of spend (context). */
  combinedBenefit: number;
  /** How the credit is paid out over three years. */
  instalments: RdInstalments;
  /** True when the whole credit is payable in year one (claim ≤ threshold). */
  paidInFullYearOne: boolean;
}

/**
 * Compute the R&D credit and its three-year instalment profile.
 *
 *   qualifying = max(0, grossExpenditure − grantFunding)   ← grants netted off
 *   credit     = qualifying × 35%
 *   i1         = max(50% × credit, min(€87,500, credit))
 *   i2         = 3/5 × (credit − i1)
 *   i3         = credit − i1 − i2          ← derived so i1 + i2 + i3 === credit.
 */
export function computeRdCredit(
  grossExpenditure: number,
  grantFunding = 0,
  config: RdConfig = RD_CONFIG_DEFAULT,
): RdCreditResult {
  const gross = round2(Math.max(0, grossExpenditure));
  // Grant can't exceed the spend it funds.
  const grant = round2(Math.min(Math.max(0, grantFunding), gross));
  const spend = round2(gross - grant);
  const credit = round2(spend * (config.ratePercent / 100));

  const firstCap = Math.min(config.firstYearThresholdEur, credit);
  const year1 = round2(Math.max(credit * 0.5, firstCap));
  const balance = round2(credit - year1);
  const year2 = round2(balance * config.secondInstalmentFraction);
  const year3 = round2(balance - year2); // remainder: keeps the sum exact

  const tradingDeductionValue = round2(
    spend * (config.tradingDeductionPercent / 100),
  );

  return {
    grossExpenditure: gross,
    grantFunding: grant,
    qualifyingSpend: spend,
    ratePercent: config.ratePercent,
    credit,
    tradingDeductionValue,
    combinedBenefit: round2(credit + tradingDeductionValue),
    instalments: { year1, year2, year3 },
    paidInFullYearOne: credit > 0 && year1 === credit,
  };
}
