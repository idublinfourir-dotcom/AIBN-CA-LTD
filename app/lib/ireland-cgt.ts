/* ──────────────────────────────────────────────────────────────────────────
   Ireland Capital Gains Tax (CGT) calculator.

   PURE FUNCTIONS ONLY, no React, no I/O, so every figure is unit-testable.
   The rates/thresholds and the indexation multiplier table here are the CODE
   FALLBACK: the live values are stored in Supabase (cgt_settings +
   cgt_multipliers) and edited from /admin/cgt-rates. cgt-data.ts reads the DB
   and falls back to these constants so the tool never renders broken numbers.

   HOW CGT WORKS (individual, one disposal)
     proceeds
       − incidental costs of disposal
       − (acquisition cost × indexation)           ← "indexed" allowable cost
       − (enhancement  cost × indexation)
       = chargeable gain (negative ⇒ allowable loss)
       − PPR relief (main-home proportion, if any)
       − allowable losses (current year, then forward)
       − annual personal exemption (€1,270)
       = taxable gain  →  × rate  =  CGT due

   INDEXATION RELIEF ("the government fixed rate")
     The cost of a pre-2003 asset is uplifted by Revenue's multiplier for the
     year the cost was incurred. Indexation is FROZEN: it only applies to
     expenditure up to 31 Dec 2002; the multiplier for 2003 onward is 1.000
     (no uplift). Pre-6 April 1974 uses the 1974/75 factor (7.528).

   Sources (verified July 2026):
   - Rate 33%, €1,270 annual exemption, allowable deductions:
       revenue.ie/en/gains-gifts-and-inheritance/what-do-you-pay-cgt-on/how-to-calculate-cgt
   - Indexation multiplier table (frozen "31 Dec 2004 et seq" column):
       revenue.ie/en/gains-gifts-and-inheritance/documents/cgtmult.pdf
   - Revised Entrepreneur Relief 10%, €1,500,000 lifetime cap (disposals on/after
     1 Jan 2026, Finance Act 2025; only post-2016 disposals count to the cap):
       revenue.ie/en/gains-gifts-and-inheritance/cgt-reliefs/revised-entrepreneur-relief
   - PPR proportional relief (last 12 months deemed occupation):
       revenue.ie/en/gains-gifts-and-inheritance/cgt-reliefs/principal-private-residence-relief

   Figures are ESTIMATES for guidance only, not tax advice.

   ── NOT MODELLED (deliberate: do NOT silently fold in) ──
   - Retirement relief (age 55+, €750k/€500k thresholds, family transfers).
   - Development-land current-use-value indexation restriction.
   - Share disposals: FIFO / "bed & breakfast" 4-week matching rules.
   - Part-disposal cost fractioning A/(A+B); €2,540 chattel exemption.
   - Deemed-occupation categories beyond the final 12 months (work abroad etc.).
   - Spouse/civil-partner no-gain/no-loss transfers; CAT interaction.
   - Non-resident / remittance-basis rules. Companies (gains via Corporation Tax
     at an effective 33%, not this individual-CGT flow).
   ────────────────────────────────────────────────────────────────────────── */

/** When the rates/multipliers below were last checked against Revenue. */
export const CGT_LAST_REVIEWED = "July 2026";
export const CGT_SOURCE_URL =
  "https://www.revenue.ie/en/gains-gifts-and-inheritance/what-do-you-pay-cgt-on/how-to-calculate-cgt.aspx";

/** Fixed special rates (statute; not part of the editable config). */
export const RATE_FOREIGN_LIFE = 40;
export const RATE_VC = 15;

/** Round to 2 decimal places, absorbing binary-float error. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ---------- editable config (code fallback; live copy in cgt_settings) ------ */

export interface CgtConfig {
  /** Standard CGT rate, e.g. 33. */
  standardRatePercent: number;
  /** Annual personal exemption in euro, e.g. 1270. */
  annualExemptionEur: number;
  /** Entrepreneur Relief rate, e.g. 10. */
  entrepreneurRatePercent: number;
  /** Entrepreneur Relief lifetime cap in euro, e.g. 1_500_000. */
  entrepreneurLifetimeCapEur: number;
}

export const CGT_CONFIG_DEFAULT: CgtConfig = {
  standardRatePercent: 33,
  annualExemptionEur: 1270,
  entrepreneurRatePercent: 10,
  entrepreneurLifetimeCapEur: 1_500_000,
};

const finiteNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Validate a stored config blob; null on any bad/missing/out-of-range field.
    Lives here (pure) so both cgt-data.ts and the tests can use it without
    pulling in the DB layer. */
export function parseCgtConfig(raw: unknown): CgtConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const s = finiteNum(o.standardRatePercent);
  const e = finiteNum(o.annualExemptionEur);
  const er = finiteNum(o.entrepreneurRatePercent);
  const ec = finiteNum(o.entrepreneurLifetimeCapEur);
  if (s === null || e === null || er === null || ec === null) return null;
  if (s < 0 || s > 100 || er < 0 || er > 100 || e < 0 || ec < 0) return null;
  return {
    standardRatePercent: s,
    annualExemptionEur: e,
    entrepreneurRatePercent: er,
    entrepreneurLifetimeCapEur: ec,
  };
}

/* ---------- indexation multipliers (code fallback; live copy in DB) -------- */

export interface CgtMultiplier {
  /** Stable id, e.g. "1995-96". */
  yearKey: string;
  /** Display label, e.g. "1995/96". */
  yearLabel: string;
  /** 0-based display order (earliest first). */
  sortOrder: number;
  /** Multiplier applied to the cost, e.g. 1.277. */
  multiplier: number;
}

/* Revenue CGT Multiplier Table: the frozen "31 Dec 2004 et seq" column, used
   for every disposal on or after 1 January 2004 (i.e. all current disposals). */
export const CGT_MULTIPLIERS_DEFAULT: CgtMultiplier[] = [
  { yearKey: "1974-75", yearLabel: "1974/75 or earlier", sortOrder: 0, multiplier: 7.528 },
  { yearKey: "1975-76", yearLabel: "1975/76", sortOrder: 1, multiplier: 6.08 },
  { yearKey: "1976-77", yearLabel: "1976/77", sortOrder: 2, multiplier: 5.238 },
  { yearKey: "1977-78", yearLabel: "1977/78", sortOrder: 3, multiplier: 4.49 },
  { yearKey: "1978-79", yearLabel: "1978/79", sortOrder: 4, multiplier: 4.148 },
  { yearKey: "1979-80", yearLabel: "1979/80", sortOrder: 5, multiplier: 3.742 },
  { yearKey: "1980-81", yearLabel: "1980/81", sortOrder: 6, multiplier: 3.24 },
  { yearKey: "1981-82", yearLabel: "1981/82", sortOrder: 7, multiplier: 2.678 },
  { yearKey: "1982-83", yearLabel: "1982/83", sortOrder: 8, multiplier: 2.253 },
  { yearKey: "1983-84", yearLabel: "1983/84", sortOrder: 9, multiplier: 2.003 },
  { yearKey: "1984-85", yearLabel: "1984/85", sortOrder: 10, multiplier: 1.819 },
  { yearKey: "1985-86", yearLabel: "1985/86", sortOrder: 11, multiplier: 1.713 },
  { yearKey: "1986-87", yearLabel: "1986/87", sortOrder: 12, multiplier: 1.637 },
  { yearKey: "1987-88", yearLabel: "1987/88", sortOrder: 13, multiplier: 1.583 },
  { yearKey: "1988-89", yearLabel: "1988/89", sortOrder: 14, multiplier: 1.553 },
  { yearKey: "1989-90", yearLabel: "1989/90", sortOrder: 15, multiplier: 1.503 },
  { yearKey: "1990-91", yearLabel: "1990/91", sortOrder: 16, multiplier: 1.442 },
  { yearKey: "1991-92", yearLabel: "1991/92", sortOrder: 17, multiplier: 1.406 },
  { yearKey: "1992-93", yearLabel: "1992/93", sortOrder: 18, multiplier: 1.356 },
  { yearKey: "1993-94", yearLabel: "1993/94", sortOrder: 19, multiplier: 1.331 },
  { yearKey: "1994-95", yearLabel: "1994/95", sortOrder: 20, multiplier: 1.309 },
  { yearKey: "1995-96", yearLabel: "1995/96", sortOrder: 21, multiplier: 1.277 },
  { yearKey: "1996-97", yearLabel: "1996/97", sortOrder: 22, multiplier: 1.251 },
  { yearKey: "1997-98", yearLabel: "1997/98", sortOrder: 23, multiplier: 1.232 },
  { yearKey: "1998-99", yearLabel: "1998/99", sortOrder: 24, multiplier: 1.212 },
  { yearKey: "1999-00", yearLabel: "1999/00", sortOrder: 25, multiplier: 1.193 },
  { yearKey: "2000-01", yearLabel: "2000/01", sortOrder: 26, multiplier: 1.144 },
  { yearKey: "2001", yearLabel: "2001 (6 Apr–31 Dec)", sortOrder: 27, multiplier: 1.087 },
  { yearKey: "2002", yearLabel: "2002", sortOrder: 28, multiplier: 1.049 },
];

/** Derive a stable year_key from an admin-entered label.
    "2003" → "2003"; "2003/04" → "2003-04"; " Pre 1974 " → "pre-1974". */
export function slugifyYearKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** True when the rates were last reviewed more than `months` ago: drives the
    admin "review due" reminder. null (unknown) → not due, so a DB blip doesn't nag. */
export function isReviewDue(reviewedAt: string | null, now: number = Date.now(), months = 12): boolean {
  if (!reviewedAt) return false;
  const t = new Date(reviewedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t > months * 30.44 * 24 * 60 * 60 * 1000;
}

/* ---------- maths ---------- */

export type RateMode = "standard" | "entrepreneur" | "rate40" | "rate15";

export interface CgtTaxBand {
  label: string;
  ratePercent: number;
  /** Slice of the taxable gain taxed at this rate. */
  amount: number;
  /** Tax on that slice. */
  tax: number;
}

export interface CgtInput {
  proceeds: number;
  /** Incidental costs of disposal (selling fees), never indexed. */
  disposalCosts: number;
  /** Acquisition cost incl. incidental buying costs. */
  acquisitionCost: number;
  /** Indexation multiplier for the acquisition year (1 = none). */
  acquisitionMultiplier: number;
  /** Enhancement (improvement) expenditure. */
  enhancementCost: number;
  /** Indexation multiplier for the enhancement year (1 = none). */
  enhancementMultiplier: number;
  currentYearLosses: number;
  broughtForwardLosses: number;
  /** Individual = true (gets the €1,270 exemption). */
  applyExemption: boolean;
  /** Main-home relief inputs (proportional). Omit for non-PPR assets. */
  ppr?: { monthsOwned: number; monthsOccupied: number };
  rateMode: RateMode;
  /** Entrepreneur Relief already claimed in the lifetime (reduces the cap). */
  entrepreneurReliefUsedEur?: number;
  /** Disposal month 1–12, for the payment-due date. */
  disposalMonth?: number;
}

export interface CgtResult {
  proceeds: number;
  disposalCosts: number;
  acquisitionCost: number;
  enhancementCost: number;
  indexedAcquisition: number;
  indexedEnhancement: number;
  allowableCost: number;
  /** Chargeable gain before reliefs (negative ⇒ allowable loss). */
  rawGain: number;
  pprRelief: number;
  /** PPR exempt proportion as a percentage (0–100). */
  exemptFractionPercent: number;
  gainAfterPpr: number;
  lossesApplied: number;
  gainAfterLosses: number;
  /** Losses left over (carried forward) after offsetting this gain. */
  lossCarried: number;
  /** True when the disposal itself is a loss. */
  isLoss: boolean;
  /** Size of that loss (0 when there's a gain). */
  disposalLoss: number;
  exemptionApplied: number;
  taxableGain: number;
  bands: CgtTaxBand[];
  totalTax: number;
  effectiveRatePercent: number;
  paymentDue: string | null;
}

/**
 * Compute CGT for one disposal. See the module header for the pipeline.
 * Every figure is derived by +/− from one computed value, so the breakdown
 * reconciles to the cent.
 */
export function computeCgt(input: CgtInput, config: CgtConfig): CgtResult {
  const proceeds = round2(Math.max(0, input.proceeds));
  const disposalCosts = round2(Math.max(0, input.disposalCosts));
  const acquisitionCost = round2(Math.max(0, input.acquisitionCost));
  const enhancementCost = round2(Math.max(0, input.enhancementCost));
  const acqMult = input.acquisitionMultiplier > 0 ? input.acquisitionMultiplier : 1;
  const enhMult = input.enhancementMultiplier > 0 ? input.enhancementMultiplier : 1;

  const indexedAcquisition = round2(acquisitionCost * acqMult);
  const indexedEnhancement = round2(enhancementCost * enhMult);
  const allowableCost = round2(indexedAcquisition + indexedEnhancement + disposalCosts);
  const rawGain = round2(proceeds - allowableCost);

  // PPR relief: proportional, positive gains only. The final 12 months count
  // as occupation ONLY if the property was a PPR at some point.
  let pprRelief = 0;
  let exemptFraction = 0;
  if (input.ppr && input.ppr.monthsOwned > 0 && rawGain > 0) {
    const owned = input.ppr.monthsOwned;
    const occupied = Math.max(0, Math.min(input.ppr.monthsOccupied, owned));
    const deemed = occupied > 0 ? 12 : 0;
    exemptFraction = Math.min(occupied + deemed, owned) / owned;
    pprRelief = round2(rawGain * exemptFraction);
  }
  const gainAfterPpr = round2(rawGain - pprRelief);

  const isLoss = gainAfterPpr < 0;
  const disposalLoss = isLoss ? round2(Math.abs(gainAfterPpr)) : 0;

  // Allowable losses reduce a positive gain (current year, then forward).
  const losses = round2(
    Math.max(0, input.currentYearLosses) + Math.max(0, input.broughtForwardLosses),
  );
  let gainAfterLosses = gainAfterPpr;
  let lossesApplied = 0;
  let lossCarried = losses;
  if (gainAfterPpr > 0) {
    lossesApplied = round2(Math.min(losses, gainAfterPpr));
    gainAfterLosses = round2(gainAfterPpr - lossesApplied);
    lossCarried = round2(losses - lossesApplied);
  }

  // Personal exemption: can't create or augment a loss.
  const exemption = input.applyExemption ? config.annualExemptionEur : 0;
  const exemptionApplied =
    gainAfterLosses > 0 ? round2(Math.min(exemption, gainAfterLosses)) : 0;
  const taxableGain = round2(Math.max(0, gainAfterLosses - exemptionApplied));

  // Tax by rate band.
  const bands: CgtTaxBand[] = [];
  const std = config.standardRatePercent;
  if (taxableGain > 0) {
    if (input.rateMode === "entrepreneur") {
      const used = Math.max(0, input.entrepreneurReliefUsedEur ?? 0);
      const capRemaining = Math.max(0, round2(config.entrepreneurLifetimeCapEur - used));
      const atRelief = round2(Math.min(taxableGain, capRemaining));
      const atStandard = round2(taxableGain - atRelief);
      if (atRelief > 0)
        bands.push({
          label: "Entrepreneur Relief",
          ratePercent: config.entrepreneurRatePercent,
          amount: atRelief,
          tax: round2(atRelief * (config.entrepreneurRatePercent / 100)),
        });
      if (atStandard > 0)
        bands.push({
          label: "Standard rate",
          ratePercent: std,
          amount: atStandard,
          tax: round2(atStandard * (std / 100)),
        });
    } else {
      const rate =
        input.rateMode === "rate40" ? RATE_FOREIGN_LIFE : input.rateMode === "rate15" ? RATE_VC : std;
      const label =
        input.rateMode === "rate40"
          ? "Foreign life policy"
          : input.rateMode === "rate15"
            ? "Venture capital fund"
            : "Standard rate";
      bands.push({ label, ratePercent: rate, amount: taxableGain, tax: round2(taxableGain * (rate / 100)) });
    }
  }
  const totalTax = round2(bands.reduce((sum, b) => sum + b.tax, 0));
  const effectiveRatePercent = taxableGain > 0 ? round2((totalTax / taxableGain) * 100) : 0;

  // Pay-and-file date: disposals Jan–Nov → 15 Dec same year; December → 31 Jan next.
  const month =
    input.disposalMonth && input.disposalMonth >= 1 && input.disposalMonth <= 12
      ? input.disposalMonth
      : undefined;
  const paymentDue = month
    ? month === 12
      ? "31 January (following year)"
      : "15 December (same year)"
    : null;

  return {
    proceeds,
    disposalCosts,
    acquisitionCost,
    enhancementCost,
    indexedAcquisition,
    indexedEnhancement,
    allowableCost,
    rawGain,
    pprRelief,
    exemptFractionPercent: round2(exemptFraction * 100),
    gainAfterPpr,
    lossesApplied,
    gainAfterLosses,
    lossCarried,
    isLoss,
    disposalLoss,
    exemptionApplied,
    taxableGain,
    bands,
    totalTax,
    effectiveRatePercent,
    paymentDue,
  };
}
