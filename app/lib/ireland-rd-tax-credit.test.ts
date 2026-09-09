/* Unit tests for the Ireland R&D Corporation Tax Credit engine.
   Run: node --test app/lib/ireland-rd-tax-credit.test.ts   (Node 22.6+ strips types)

   Covers the 35% credit, the three-instalment split across every claim size
   (small → full in year one; medium → threshold-led; large → 50/30/20), the
   i1 + i2 + i3 === credit reconciliation, and zero / negative edge inputs. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRdCredit,
  parseRdConfig,
  round2,
  RD_CREDIT,
  RD_CONFIG_DEFAULT,
  type RdCreditResult,
} from "./ireland-rd-tax-credit.ts";

/** The instalments must always sum back to the credit, to the cent. */
function assertReconciles(r: RdCreditResult) {
  const { year1, year2, year3 } = r.instalments;
  assert.equal(round2(year1 + year2 + year3), r.credit, "instalments must sum to credit");
}

test("Credit is 35% of qualifying spend", () => {
  const r = computeRdCredit(100_000);
  assert.equal(r.credit, 35_000);
  assert.equal(r.ratePercent, 35);
});

test("Small claim (credit ≤ €87,500) is paid in full in year one", () => {
  const r = computeRdCredit(100_000); // credit 35,000
  assert.deepEqual(r.instalments, { year1: 35_000, year2: 0, year3: 0 });
  assert.equal(r.paidInFullYearOne, true);
  assertReconciles(r);
});

test("Claim exactly at the threshold is still fully paid in year one", () => {
  const r = computeRdCredit(250_000); // credit 87,500 = threshold
  assert.equal(r.credit, 87_500);
  assert.deepEqual(r.instalments, { year1: 87_500, year2: 0, year3: 0 });
  assert.equal(r.paidInFullYearOne, true);
});

test("Medium claim: first instalment capped at the €87,500 threshold", () => {
  // spend 300k → credit 105k. 50% (52,500) < 87,500, so year1 = 87,500.
  const r = computeRdCredit(300_000);
  assert.equal(r.credit, 105_000);
  assert.equal(r.instalments.year1, 87_500);
  assert.equal(r.instalments.year2, 10_500); // 3/5 of 17,500
  assert.equal(r.instalments.year3, 7_000); //  balance
  assert.equal(r.paidInFullYearOne, false);
  assertReconciles(r);
});

test("Large claim: resolves to the fixed 50% / 30% / 20% split", () => {
  // spend 1,000,000 → credit 350,000. 50% (175,000) > 87,500 → year1 = 175,000.
  const r = computeRdCredit(1_000_000);
  assert.equal(r.credit, 350_000);
  assert.equal(r.instalments.year1, 175_000); // 50%
  assert.equal(r.instalments.year2, 105_000); // 30%
  assert.equal(r.instalments.year3, 70_000); //  20%
  assertReconciles(r);
});

test("Grant funding is netted off before the credit is calculated", () => {
  // €300k spend − €50k grant = €250k qualifying → credit €87,500 (full year 1).
  const r = computeRdCredit(300_000, 50_000);
  assert.equal(r.grossExpenditure, 300_000);
  assert.equal(r.grantFunding, 50_000);
  assert.equal(r.qualifyingSpend, 250_000);
  assert.equal(r.credit, 87_500);
  assert.equal(r.paidInFullYearOne, true);
});

test("Grant is capped at the spend it funds; excess never goes negative", () => {
  const r = computeRdCredit(100_000, 250_000); // grant > spend
  assert.equal(r.grantFunding, 100_000); // capped at gross
  assert.equal(r.qualifyingSpend, 0);
  assert.equal(r.credit, 0);
});

test("Negative grant clamps to zero; default grant is zero", () => {
  assert.equal(computeRdCredit(100_000, -5_000).qualifyingSpend, 100_000);
  assert.equal(computeRdCredit(100_000).grantFunding, 0);
});

test("Combined benefit ≈ 47.5% (credit 35% + trading deduction 12.5%)", () => {
  const r = computeRdCredit(200_000);
  assert.equal(r.credit, 70_000); // 35%
  assert.equal(r.tradingDeductionValue, 25_000); // 12.5%
  assert.equal(r.combinedBenefit, 95_000); // 47.5%
});

test("Reconciliation holds across awkward amounts", () => {
  for (const spend of [1, 33_333.33, 249_999.99, 250_000.01, 617_284.5, 1_234_567]) {
    assertReconciles(computeRdCredit(spend));
  }
});

test("Rounding: credit rounds to the cent", () => {
  const r = computeRdCredit(33_333.33); // 33,333.33 × 0.35 = 11,666.6655
  assert.equal(r.credit, 11_666.67);
});

test("Edge inputs: zero and negatives clamp to zero, no NaN", () => {
  const z = computeRdCredit(0);
  assert.equal(z.credit, 0);
  assert.deepEqual(z.instalments, { year1: 0, year2: 0, year3: 0 });
  assert.equal(z.paidInFullYearOne, false); // nothing to pay
  const neg = computeRdCredit(-500_000);
  assert.equal(neg.qualifyingSpend, 0);
  assert.equal(neg.credit, 0);
});

test("Config holds the documented statutory values", () => {
  assert.equal(RD_CREDIT.ratePercent, 35);
  assert.equal(RD_CREDIT.firstYearThresholdEur, 87_500);
  assert.equal(RD_CREDIT.secondInstalmentFraction, 0.6);
});

test("RD_CREDIT is derived from RD_CONFIG_DEFAULT (no drift)", () => {
  assert.equal(RD_CREDIT.ratePercent, RD_CONFIG_DEFAULT.ratePercent);
  assert.equal(RD_CREDIT.firstYearThresholdEur, RD_CONFIG_DEFAULT.firstYearThresholdEur);
  assert.equal(RD_CREDIT.secondInstalmentFraction, RD_CONFIG_DEFAULT.secondInstalmentFraction);
  assert.equal(RD_CREDIT.tradingDeductionPercent, RD_CONFIG_DEFAULT.tradingDeductionPercent);
});

test("Custom config arg overrides the defaults", () => {
  // Hypothetical: 40% credit, threshold €100k, fixed 50/30/20 for a big claim.
  const r = computeRdCredit(1_000_000, 0, {
    ratePercent: 40,
    tradingDeductionPercent: 12.5,
    firstYearThresholdEur: 100_000,
    secondInstalmentFraction: 0.6,
  });
  assert.equal(r.credit, 400_000); // 40%
  assert.equal(r.instalments.year1, 200_000); // 50% beats the 100k floor
  assert.equal(round2(r.instalments.year1 + r.instalments.year2 + r.instalments.year3), r.credit);
});

test("parseRdConfig: valid blob round-trips", () => {
  const cfg = parseRdConfig(structuredClone(RD_CONFIG_DEFAULT));
  assert.deepEqual(cfg, RD_CONFIG_DEFAULT);
});

test("parseRdConfig: rejects bad / out-of-range / missing", () => {
  assert.equal(parseRdConfig(null), null);
  assert.equal(parseRdConfig({ ratePercent: 35 }), null); // missing fields
  assert.equal(parseRdConfig({ ...RD_CONFIG_DEFAULT, ratePercent: 250 }), null); // range
  assert.equal(parseRdConfig({ ...RD_CONFIG_DEFAULT, secondInstalmentFraction: 2 }), null); // >1
});
