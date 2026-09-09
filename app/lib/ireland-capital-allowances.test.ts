/* Unit tests for the Ireland Capital Allowances engine.
   Run: node --test app/lib/ireland-capital-allowances.test.ts   (Node 22.6+ strips types)

   Covers plant & machinery (12.5%/8yr), industrial buildings (4%/25yr), the
   100% energy-efficient ACA, the car €24,000 cap + CO2 groups (full / 50% /
   nil), the schedule → allowableCost reconciliation, and edge inputs. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCapitalAllowance,
  parseCaConfig,
  round2,
  MOTOR_CAP_EUR,
  CA_CONFIG_DEFAULT,
  getAssetClass,
  getCo2Group,
  type CapitalAllowanceResult,
} from "./ireland-capital-allowances.ts";

/** The yearly allowances must sum back to the allowable cost, to the cent. */
function assertScheduleSums(r: CapitalAllowanceResult) {
  const sum = r.firstYearFull
    ? r.firstYearAllowance
    : round2(r.annualAllowance * (r.years - 1) + r.finalYearAllowance);
  assert.equal(sum, r.allowableCost, "schedule must sum to allowable cost");
}

test("Plant & machinery: 12.5% straight-line over 8 years", () => {
  const r = computeCapitalAllowance({ assetKey: "plant-machinery", cost: 80_000 });
  assert.equal(r.allowableCost, 80_000);
  assert.equal(r.annualAllowance, 10_000); // 12.5%
  assert.equal(r.years, 8);
  assert.equal(r.totalAllowances, 80_000);
  assert.equal(r.taxSaving, 10_000); // 12.5% of 80,000
  assert.equal(r.restricted, false);
  assertScheduleSums(r);
});

test("Industrial building: 4% straight-line over 25 years", () => {
  const r = computeCapitalAllowance({ assetKey: "industrial-building", cost: 100_000 });
  assert.equal(r.annualAllowance, 4_000); // 4%
  assert.equal(r.years, 25);
  assert.equal(r.totalAllowances, 100_000);
  assertScheduleSums(r);
});

test("Energy-efficient equipment: 100% in year one (ACA)", () => {
  const r = computeCapitalAllowance({ assetKey: "energy-efficient", cost: 50_000 });
  assert.equal(r.firstYearFull, true);
  assert.equal(r.firstYearAllowance, 50_000);
  assert.equal(r.years, 1);
  assert.equal(r.totalAllowances, 50_000);
  assert.equal(r.taxSaving, 6_250);
  assertScheduleSums(r);
});

test("Car (Group 1, ≤155 g/km): capped at €24,000, full relief", () => {
  const r = computeCapitalAllowance({
    assetKey: "motor-vehicle",
    cost: 30_000,
    co2Group: "group1",
  });
  assert.equal(r.allowableCost, 24_000); // capped from 30,000
  assert.equal(r.annualAllowance, 3_000); // 12.5% of 24,000
  assert.equal(r.restricted, true);
  assertScheduleSums(r);
});

test("Car (Group 1) below the cap: allowances on the actual cost", () => {
  const r = computeCapitalAllowance({
    assetKey: "motor-vehicle",
    cost: 20_000,
    co2Group: "group1",
  });
  assert.equal(r.allowableCost, 20_000); // under €24,000, no cap
  assert.equal(r.annualAllowance, 2_500);
  assert.equal(r.restricted, false);
});

test("Car (Group 2, 156–190 g/km): 50% of the capped cost", () => {
  const over = computeCapitalAllowance({
    assetKey: "motor-vehicle",
    cost: 30_000,
    co2Group: "group2",
  });
  assert.equal(over.allowableCost, 12_000); // 50% of €24,000
  assert.equal(over.annualAllowance, 1_500);

  const under = computeCapitalAllowance({
    assetKey: "motor-vehicle",
    cost: 20_000,
    co2Group: "group2",
  });
  assert.equal(under.allowableCost, 10_000); // 50% of 20,000
  assert.equal(under.annualAllowance, 1_250);
});

test("Car (Group 3, >190 g/km): no allowances at all", () => {
  const r = computeCapitalAllowance({
    assetKey: "motor-vehicle",
    cost: 30_000,
    co2Group: "group3",
  });
  assert.equal(r.allowableCost, 0);
  assert.equal(r.annualAllowance, 0);
  assert.equal(r.totalAllowances, 0);
  assert.equal(r.taxSaving, 0);
  assert.equal(r.restricted, true);
});

test("Car defaults to full relief (Group 1) when no CO2 group is given", () => {
  const r = computeCapitalAllowance({ assetKey: "motor-vehicle", cost: 24_000 });
  assert.equal(r.allowableCost, 24_000);
});

test("Rounding: schedule reconciles for an awkward amount", () => {
  const r = computeCapitalAllowance({ assetKey: "plant-machinery", cost: 12_345.67 });
  assert.equal(r.annualAllowance, 1_543.21); // 12,345.67 × 12.5% = 1,543.20875
  assertScheduleSums(r); // final year absorbs the remainder
});

test("Edge inputs: zero and negatives clamp to zero", () => {
  const z = computeCapitalAllowance({ assetKey: "plant-machinery", cost: 0 });
  assert.equal(z.annualAllowance, 0);
  assert.equal(z.totalAllowances, 0);
  const neg = computeCapitalAllowance({ assetKey: "plant-machinery", cost: -50_000 });
  assert.equal(neg.cost, 0);
  assert.equal(neg.totalAllowances, 0);
});

test("Config holds the documented statutory values", () => {
  assert.equal(MOTOR_CAP_EUR, 24_000);
  assert.equal(getAssetClass("plant-machinery").ratePercent, 12.5);
  assert.equal(getAssetClass("plant-machinery").years, 8);
  assert.equal(getAssetClass("industrial-building").ratePercent, 4);
  assert.equal(getAssetClass("industrial-building").years, 25);
  assert.equal(getAssetClass("energy-efficient").firstYearFull, true);
  assert.equal(getCo2Group("group1").factor, 1);
  assert.equal(getCo2Group("group2").factor, 0.5);
  assert.equal(getCo2Group("group3").factor, 0);
});

test("CA_CONFIG_DEFAULT references the module consts (no drift)", () => {
  assert.equal(CA_CONFIG_DEFAULT.motorCapEur, MOTOR_CAP_EUR);
  assert.equal(CA_CONFIG_DEFAULT.tradingCtPercent, 12.5);
  assert.equal(
    CA_CONFIG_DEFAULT.classes.find((c) => c.key === "plant-machinery")?.ratePercent,
    12.5,
  );
});

test("Custom config arg overrides rate, years and the car cap", () => {
  const cfg = structuredClone(CA_CONFIG_DEFAULT);
  const pm = cfg.classes.find((c) => c.key === "plant-machinery")!;
  pm.ratePercent = 20; // 20% instead of 12.5%
  pm.years = 5;
  cfg.tradingCtPercent = 15;

  const r = computeCapitalAllowance({ assetKey: "plant-machinery", cost: 100_000 }, cfg);
  assert.equal(r.annualAllowance, 20_000); // 20%
  assert.equal(r.years, 5);
  assert.equal(r.taxSaving, 15_000); // 15% of 100,000
});

test("Custom config: a higher car cap raises the allowable cost", () => {
  const cfg = structuredClone(CA_CONFIG_DEFAULT);
  cfg.motorCapEur = 40_000;
  const r = computeCapitalAllowance(
    { assetKey: "motor-vehicle", cost: 35_000, co2Group: "group1" },
    cfg,
  );
  assert.equal(r.allowableCost, 35_000); // under the raised 40k cap → not capped
  assert.equal(r.restricted, false);
});

test("parseCaConfig: valid blob round-trips", () => {
  const cfg = parseCaConfig(structuredClone(CA_CONFIG_DEFAULT));
  assert.ok(cfg);
  assert.equal(cfg?.classes.length, CA_CONFIG_DEFAULT.classes.length);
  assert.equal(cfg?.motorCapEur, 24_000);
});

test("parseCaConfig: rejects bad / missing / out-of-range", () => {
  assert.equal(parseCaConfig(null), null);
  assert.equal(parseCaConfig({ classes: [], motorCapEur: 24_000, tradingCtPercent: 12.5 }), null);
  const missingKey = structuredClone(CA_CONFIG_DEFAULT);
  missingKey.classes = missingKey.classes.filter((c) => c.key !== "energy-efficient");
  assert.equal(parseCaConfig(missingKey), null);
  const badRate = structuredClone(CA_CONFIG_DEFAULT);
  badRate.classes[0].ratePercent = 200;
  assert.equal(parseCaConfig(badRate), null);
  const badCap = structuredClone(CA_CONFIG_DEFAULT);
  badCap.motorCapEur = -5;
  assert.equal(parseCaConfig(badCap), null);
});
