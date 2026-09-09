/* Unit tests for the Ireland CAT engine.
   Run: node --test app/lib/ireland-cat.test.ts   (Node 22.6+ strips types)

   Every result field derives by +/- from one computed value, so the breakdown
   reconciles to the cent. Cases cross-checked against Revenue worked examples. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCat,
  parseCatConfig,
  groupFor,
  thresholdFor,
  reliefPercentFor,
  round2,
  CAT_CONFIG_DEFAULT,
  type CatInput,
} from "./ireland-cat.ts";

const base: CatInput = {
  benefitType: "gift",
  relationship: "child",
  marketValue: 0,
  deductibleLiabilities: 0,
  relief: "none",
  applySmallGiftExemption: true,
  priorBenefits: 0,
  valuationMonth: 6,
};

test("group derivation: child A, sibling/niece/grandchild B, cousin C", () => {
  assert.equal(groupFor("child", "gift"), "A");
  assert.equal(groupFor("sibling", "inheritance"), "B");
  assert.equal(groupFor("niece-nephew", "gift"), "B");
  assert.equal(groupFor("grandchild", "inheritance"), "B");
  assert.equal(groupFor("uncle-aunt", "inheritance"), "C");
  assert.equal(groupFor("cousin", "gift"), "C");
  assert.equal(groupFor("other", "gift"), "C");
});

test("parent flips group by benefit type: gift B, inheritance A", () => {
  assert.equal(groupFor("parent", "gift"), "B");
  assert.equal(groupFor("parent", "inheritance"), "A");
});

test("threshold + relief lookups read the config", () => {
  assert.equal(thresholdFor("A", CAT_CONFIG_DEFAULT), 400_000);
  assert.equal(thresholdFor("B", CAT_CONFIG_DEFAULT), 40_000);
  assert.equal(thresholdFor("C", CAT_CONFIG_DEFAULT), 20_000);
  assert.equal(reliefPercentFor("agricultural", CAT_CONFIG_DEFAULT), 90);
  assert.equal(reliefPercentFor("business", CAT_CONFIG_DEFAULT), 90);
  assert.equal(reliefPercentFor("dwelling-house", CAT_CONFIG_DEFAULT), 100);
  assert.equal(reliefPercentFor("none", CAT_CONFIG_DEFAULT), 0);
});

test("Revenue 'Claire': Group A, prior €365k, current €40k → excess €5,000", () => {
  const r = computeCat(
    { ...base, benefitType: "inheritance", relationship: "child",
      marketValue: 40_000, applySmallGiftExemption: false, priorBenefits: 365_000 },
    CAT_CONFIG_DEFAULT,
  );
  assert.equal(r.thresholdRemaining, 35_000);
  assert.equal(r.taxableExcess, 5_000);
  assert.equal(r.catDue, 1_650); // 5,000 × 33%
});

test("CitizensInfo house gift €620k Group A → €71,610", () => {
  const r = computeCat(
    { ...base, benefitType: "gift", relationship: "child", marketValue: 620_000 },
    CAT_CONFIG_DEFAULT,
  );
  // 620,000 − 3,000 small gift = 617,000; − 400,000 threshold = 217,000 taxable
  assert.equal(r.smallGiftExemptionApplied, 3_000);
  assert.equal(r.currentTaxableValue, 617_000);
  assert.equal(r.taxableExcess, 217_000);
  assert.equal(r.catDue, 71_610);
});

test("small gift exemption: inheritance never gets it; toggle off skips it", () => {
  const inh = computeCat({ ...base, benefitType: "inheritance", marketValue: 10_000 }, CAT_CONFIG_DEFAULT);
  assert.equal(inh.smallGiftExemptionApplied, 0);
  const off = computeCat({ ...base, benefitType: "gift", marketValue: 10_000, applySmallGiftExemption: false }, CAT_CONFIG_DEFAULT);
  assert.equal(off.smallGiftExemptionApplied, 0);
  const on = computeCat({ ...base, benefitType: "gift", marketValue: 10_000 }, CAT_CONFIG_DEFAULT);
  assert.equal(on.smallGiftExemptionApplied, 3_000);
});

test("agricultural relief knocks 90% off before threshold", () => {
  // €1,000,000 farm to a child (inheritance), no prior benefits.
  const r = computeCat(
    { ...base, benefitType: "inheritance", relationship: "child",
      marketValue: 1_000_000, relief: "agricultural", applySmallGiftExemption: false },
    CAT_CONFIG_DEFAULT,
  );
  assert.equal(r.reliefAmount, 900_000);
  assert.equal(r.reducedValue, 100_000);
  assert.equal(r.currentTaxableValue, 100_000);
  assert.equal(r.taxableExcess, 0); // 100,000 < 400,000 Group A threshold
  assert.equal(r.catDue, 0);
});

test("dwelling house exemption zeroes the taxable value", () => {
  const r = computeCat(
    { ...base, benefitType: "inheritance", relationship: "other",
      marketValue: 500_000, relief: "dwelling-house", applySmallGiftExemption: false },
    CAT_CONFIG_DEFAULT,
  );
  assert.equal(r.reducedValue, 0);
  assert.equal(r.taxableExcess, 0);
  assert.equal(r.catDue, 0);
});

test("deductible liabilities reduce the incumbrance-free value", () => {
  const r = computeCat(
    { ...base, benefitType: "inheritance", relationship: "child",
      marketValue: 500_000, deductibleLiabilities: 100_000, applySmallGiftExemption: false },
    CAT_CONFIG_DEFAULT,
  );
  assert.equal(r.incumbranceFreeValue, 400_000);
  assert.equal(r.taxableExcess, 0); // 400,000 == threshold
});

test("prior benefits over threshold → whole current benefit taxable", () => {
  const r = computeCat(
    { ...base, benefitType: "inheritance", relationship: "sibling",
      marketValue: 20_000, applySmallGiftExemption: false, priorBenefits: 60_000 },
    CAT_CONFIG_DEFAULT,
  );
  assert.equal(r.thresholdRemaining, 0); // 40,000 − 60,000 clamped
  assert.equal(r.taxableExcess, 20_000);
  assert.equal(r.catDue, 6_600);
});

test("payment due: valuation month drives the deadline", () => {
  assert.equal(computeCat({ ...base, valuationMonth: 3 }, CAT_CONFIG_DEFAULT).paymentDue, "31 October (same year)");
  assert.equal(computeCat({ ...base, valuationMonth: 8 }, CAT_CONFIG_DEFAULT).paymentDue, "31 October (same year)");
  assert.equal(computeCat({ ...base, valuationMonth: 9 }, CAT_CONFIG_DEFAULT).paymentDue, "31 October (following year)");
  assert.equal(computeCat({ ...base, valuationMonth: 12 }, CAT_CONFIG_DEFAULT).paymentDue, "31 October (following year)");
  assert.equal(computeCat({ ...base, valuationMonth: undefined }, CAT_CONFIG_DEFAULT).paymentDue, null);
});

test("negative / zero inputs clamp to zero (no negative tax)", () => {
  const r = computeCat({ ...base, marketValue: -5000, deductibleLiabilities: -10 }, CAT_CONFIG_DEFAULT);
  assert.equal(r.marketValue, 0);
  assert.equal(r.taxableExcess, 0);
  assert.equal(r.catDue, 0);
});

test("effective rate: tax over the full current taxable value", () => {
  const r = computeCat(
    { ...base, benefitType: "inheritance", relationship: "child",
      marketValue: 800_000, applySmallGiftExemption: false },
    CAT_CONFIG_DEFAULT,
  );
  // taxable 400,000 × 33% = 132,000; effective over 800,000 taxable value = 16.5%
  assert.equal(r.catDue, 132_000);
  assert.equal(r.effectiveRatePercent, 16.5);
});

test("round2 absorbs binary-float error", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

test("parseCatConfig: code default round-trips", () => {
  const cfg = parseCatConfig(structuredClone(CAT_CONFIG_DEFAULT));
  assert.notEqual(cfg, null);
  if (cfg) {
    assert.equal(cfg.ratePercent, 33);
    assert.equal(cfg.thresholds.groupA, 400_000);
    assert.equal(cfg.reliefs.dwellingHousePercent, 100);
  }
});

test("parseCatConfig: rejects bad blobs", () => {
  assert.equal(parseCatConfig(null), null);
  assert.equal(parseCatConfig({}), null);
  const noReliefs = structuredClone(CAT_CONFIG_DEFAULT) as unknown as Record<string, unknown>;
  delete noReliefs.reliefs;
  assert.equal(parseCatConfig(noReliefs), null);
  const badRate = structuredClone(CAT_CONFIG_DEFAULT);
  badRate.ratePercent = 250;
  assert.equal(parseCatConfig(badRate), null);
  const negThreshold = structuredClone(CAT_CONFIG_DEFAULT);
  negThreshold.thresholds.groupB = -1;
  assert.equal(parseCatConfig(negThreshold), null);
});
