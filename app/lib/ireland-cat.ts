/* ──────────────────────────────────────────────────────────────────────────
   Ireland Capital Acquisitions Tax (CAT): gift & inheritance tax.

   PURE FUNCTIONS ONLY, no React, no I/O, so every figure is unit-testable.
   The rates/thresholds/reliefs here are the CODE FALLBACK: the live values are
   stored in Supabase (calculator_settings, key 'cat') and edited from
   /admin/cat-rates. cat-data.ts reads the DB and falls back to these constants
   so the tool never renders broken numbers.

   HOW CAT WORKS (one benefit)
     marketValue
       − deductible liabilities / costs / consideration   = incumbrance-free value
       × (1 − relief%/100)      ← Agri 90% / Business 90% / Dwelling-house 100%
       − small gift exemption (€3,000, GIFTS only, if applied)
       = current taxable value
     aggregate with prior SAME-GROUP benefits since 5 Dec 1991:
       thresholdRemaining = max(0, groupThreshold − priorBenefits)
       taxableExcess      = max(0, currentTaxableValue − thresholdRemaining)
       CAT                = taxableExcess × 33%

   WHY the simplified thresholdRemaining line is exact: Revenue taxes the
   aggregate (prior+current) above the threshold then credits tax on the prior
   benefits. With a FLAT rate r,  r·[max(0,p+c−T) − max(0,p−T)] == r·max(0,
   c − max(0,T−p))  for all p,c,T ≥ 0. This equality DEPENDS ON THE FLAT RATE:
   if CAT ever gets bands, replace this with an aggregate-minus-prior computation.

   Sources (verified July 2026):
   - Rate 33%: revenue.ie/.../cat-thresholds-rates-and-aggregation-rules/cat-rates
   - Group thresholds A €400k / B €40k / C €20k (on/after 2 Oct 2024): .../cat-thresholds
   - Groups (relationships): .../cat-groups
   - Aggregation since 5 Dec 1991: .../cat-aggregation-rules
   - Small gift exemption €3,000, gifts only, not aggregated:
       revenue.ie/.../cat-exemptions/small-gift-exemption
   - Agricultural relief 90%: .../cat-reliefs/agricultural-relief
   - Business relief 90%: .../cat-reliefs/business-relief
   - Pay & file (31 Oct rule): .../important-dates-for-cat

   Figures are ESTIMATES for guidance only, not tax advice.

   ── NOT MODELLED (deliberate: do NOT silently fold in) ──
   - Favourite nephew/niece relief; agricultural/business relief CLAWBACK on
     early disposal + active-farmer / 80%-farmer-asset / 6-yr-retention tests.
   - "Certain inheritances taken by parents" full exemption (parent inherits from
     a child within 5 yrs of an earlier non-exempt benefit).
   - Disponer-pays-tax grossing-up; gift-splitting 3-year rule.
   - Parent + inheritance is assumed an ABSOLUTE interest (Group A); a limited
     interest would be Group B, not offered as an input.
   - Dwelling House Exemption shown as a 100% relief toggle; in law it is chiefly
     an inheritance relief (a gift qualifies only for a dependent relative).
   - €3,000 small gift is per disponer per year across multiple gifts: one
     benefit modelled at a time (hence the toggle).
   ────────────────────────────────────────────────────────────────────────── */

/** When the rates below were last checked against Revenue. */
export const CAT_LAST_REVIEWED = "July 2026";
export const CAT_SOURCE_URL =
  "https://www.revenue.ie/en/gains-gifts-and-inheritance/gift-and-inheritance-tax-cat/how-do-you-calculate-cat.aspx";

/** Round to 2 decimal places, absorbing binary-float error. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ---------- editable config (code fallback; live copy in calculator_settings) ---------- */

export interface CatConfig {
  /** Flat CAT rate, e.g. 33. */
  ratePercent: number;
  /** Group tax-free thresholds in euro. */
  thresholds: { groupA: number; groupB: number; groupC: number };
  /** Small gift exemption in euro, e.g. 3000. */
  smallGiftExemptionEur: number;
  /** Relief reductions as percentages. */
  reliefs: {
    agriculturalPercent: number;
    businessPercent: number;
    dwellingHousePercent: number;
  };
}

export const CAT_CONFIG_DEFAULT: CatConfig = {
  ratePercent: 33,
  thresholds: { groupA: 400_000, groupB: 40_000, groupC: 20_000 },
  smallGiftExemptionEur: 3_000,
  reliefs: { agriculturalPercent: 90, businessPercent: 90, dwellingHousePercent: 100 },
};

const pct = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
const euro = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

/** Validate a stored config blob; null on any bad/missing/out-of-range field.
    Pure, so both cat-data.ts and the tests use it without the DB layer. */
export function parseCatConfig(raw: unknown): CatConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const t = o.thresholds as Record<string, unknown> | undefined;
  const r = o.reliefs as Record<string, unknown> | undefined;
  if (typeof t !== "object" || t === null) return null;
  if (typeof r !== "object" || r === null) return null;

  const ratePercent = pct(o.ratePercent);
  const groupA = euro(t.groupA);
  const groupB = euro(t.groupB);
  const groupC = euro(t.groupC);
  const smallGiftExemptionEur = euro(o.smallGiftExemptionEur);
  const agriculturalPercent = pct(r.agriculturalPercent);
  const businessPercent = pct(r.businessPercent);
  const dwellingHousePercent = pct(r.dwellingHousePercent);

  if (
    ratePercent === null || groupA === null || groupB === null || groupC === null ||
    smallGiftExemptionEur === null || agriculturalPercent === null ||
    businessPercent === null || dwellingHousePercent === null
  )
    return null;

  return {
    ratePercent,
    thresholds: { groupA, groupB, groupC },
    smallGiftExemptionEur,
    reliefs: { agriculturalPercent, businessPercent, dwellingHousePercent },
  };
}

/* ---------- groups & relationships ---------- */

export type BenefitType = "gift" | "inheritance";
export type CatGroup = "A" | "B" | "C";
export type Relationship =
  | "child"
  | "parent"
  | "sibling"
  | "niece-nephew"
  | "grandchild"
  | "grandparent"
  | "uncle-aunt"
  | "cousin"
  | "in-law"
  | "other";

/** Dropdown options: the beneficiary IS the disponer's ___. Order = display order. */
export const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Brother / Sister" },
  { value: "niece-nephew", label: "Niece / Nephew" },
  { value: "grandchild", label: "Grandchild" },
  { value: "grandparent", label: "Grandparent" },
  { value: "uncle-aunt", label: "Uncle / Aunt" },
  { value: "cousin", label: "Cousin" },
  { value: "in-law", label: "In-law" },
  { value: "other", label: "Other / Friend" },
];

/** Map a relationship (+ benefit type, for the parent nuance) to a CAT group.
    Parent = Group A on an absolute inheritance, Group B on a gift. */
export function groupFor(rel: Relationship, benefit: BenefitType): CatGroup {
  switch (rel) {
    case "child":
      return "A";
    case "parent":
      return benefit === "inheritance" ? "A" : "B";
    case "sibling":
    case "niece-nephew":
    case "grandchild":
    case "grandparent":
      return "B";
    default:
      return "C"; // uncle-aunt, cousin, in-law, other
  }
}

export function thresholdFor(group: CatGroup, config: CatConfig): number {
  return group === "A"
    ? config.thresholds.groupA
    : group === "B"
      ? config.thresholds.groupB
      : config.thresholds.groupC;
}

export type ReliefKind = "none" | "agricultural" | "business" | "dwelling-house";

export const RELIEF_LABEL: Record<ReliefKind, string> = {
  none: "No relief",
  agricultural: "Agricultural Relief",
  business: "Business Relief",
  "dwelling-house": "Dwelling House Exemption",
};

export function reliefPercentFor(kind: ReliefKind, config: CatConfig): number {
  switch (kind) {
    case "agricultural":
      return config.reliefs.agriculturalPercent;
    case "business":
      return config.reliefs.businessPercent;
    case "dwelling-house":
      return config.reliefs.dwellingHousePercent;
    default:
      return 0;
  }
}

/* ---------- maths ---------- */

export interface CatInput {
  benefitType: BenefitType;
  relationship: Relationship;
  /** Market value of the benefit. */
  marketValue: number;
  /** Liabilities / costs / consideration paid: reduce the taxable value. */
  deductibleLiabilities: number;
  relief: ReliefKind;
  /** Apply the €3,000 small gift exemption (gifts only; ignored for inheritances). */
  applySmallGiftExemption: boolean;
  /** Prior taxable benefits in the SAME group since 5 Dec 1991. */
  priorBenefits: number;
  /** Valuation month 1–12, for the pay-and-file date. */
  valuationMonth?: number;
}

export interface CatResult {
  benefitType: BenefitType;
  relationship: Relationship;
  group: CatGroup;
  groupThreshold: number;
  marketValue: number;
  deductibleLiabilities: number;
  incumbranceFreeValue: number;
  relief: ReliefKind;
  reliefLabel: string;
  reliefPercent: number;
  reliefAmount: number;
  reducedValue: number;
  smallGiftExemptionApplied: number;
  currentTaxableValue: number;
  priorBenefits: number;
  thresholdRemaining: number;
  taxableExcess: number;
  ratePercent: number;
  catDue: number;
  /** Tax over the current taxable value (0 when nothing is taxable). */
  effectiveRatePercent: number;
  paymentDue: string | null;
}

/**
 * Compute CAT for one benefit. See the module header for the pipeline.
 * Every figure derives by +/− from one computed value, so the breakdown
 * reconciles to the cent.
 */
export function computeCat(input: CatInput, config: CatConfig): CatResult {
  const marketValue = round2(Math.max(0, input.marketValue));
  const deductibleLiabilities = round2(Math.max(0, input.deductibleLiabilities));
  const priorBenefits = round2(Math.max(0, input.priorBenefits));

  const incumbranceFreeValue = round2(Math.max(0, marketValue - deductibleLiabilities));

  const reliefPercent = reliefPercentFor(input.relief, config);
  const reliefAmount = round2(incumbranceFreeValue * (reliefPercent / 100));
  const reducedValue = round2(incumbranceFreeValue - reliefAmount);

  // Small gift exemption: gifts only, when the user leaves the toggle on.
  const smallGiftExemptionApplied =
    input.benefitType === "gift" && input.applySmallGiftExemption
      ? round2(Math.min(config.smallGiftExemptionEur, reducedValue))
      : 0;
  const currentTaxableValue = round2(Math.max(0, reducedValue - smallGiftExemptionApplied));

  const group = groupFor(input.relationship, input.benefitType);
  const groupThreshold = thresholdFor(group, config);
  const thresholdRemaining = round2(Math.max(0, groupThreshold - priorBenefits));
  const taxableExcess = round2(Math.max(0, currentTaxableValue - thresholdRemaining));

  const ratePercent = config.ratePercent;
  const catDue = round2(taxableExcess * (ratePercent / 100));
  const effectiveRatePercent =
    currentTaxableValue > 0 ? round2((catDue / currentTaxableValue) * 100) : 0;

  // Pay & file: valuation date Jan–Aug → 31 Oct same year; Sep–Dec → 31 Oct next.
  const m =
    input.valuationMonth && input.valuationMonth >= 1 && input.valuationMonth <= 12
      ? input.valuationMonth
      : undefined;
  const paymentDue = m
    ? m <= 8
      ? "31 October (same year)"
      : "31 October (following year)"
    : null;

  return {
    benefitType: input.benefitType,
    relationship: input.relationship,
    group,
    groupThreshold,
    marketValue,
    deductibleLiabilities,
    incumbranceFreeValue,
    relief: input.relief,
    reliefLabel: RELIEF_LABEL[input.relief],
    reliefPercent,
    reliefAmount,
    reducedValue,
    smallGiftExemptionApplied,
    currentTaxableValue,
    priorBenefits,
    thresholdRemaining,
    taxableExcess,
    ratePercent,
    catDue,
    effectiveRatePercent,
    paymentDue,
  };
}
