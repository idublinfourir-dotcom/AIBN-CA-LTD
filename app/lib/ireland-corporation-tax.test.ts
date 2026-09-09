/* Unit tests for the Ireland Corporation Tax engine.
   Run: node --test app/lib/ireland-corporation-tax.test.ts   (Node 22.6+ strips types)

   Covers trading-only, passive-only, mixed profit with a blended effective
   rate, rounding, and zero / negative edge inputs. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCorporationTax,
  parseCorporationTaxConfig,
  CT_RATES,
  CT_CONFIG_DEFAULT,
} from "./ireland-corporation-tax.ts";

test("Trading only: 12.5%", () => {
  const r = computeCorporationTax({ tradingProfit: 100_000, passiveIncome: 0 });
  assert.equal(r.tradingTax, 12_500);
  assert.equal(r.passiveTax, 0);
  assert.equal(r.totalTax, 12_500);
  assert.equal(r.effectiveRate, 0.125);
});

test("Passive only: 25%", () => {
  const r = computeCorporationTax({ tradingProfit: 0, passiveIncome: 100_000 });
  assert.equal(r.passiveTax, 25_000);
  assert.equal(r.tradingTax, 0);
  assert.equal(r.totalTax, 25_000);
  assert.equal(r.effectiveRate, 0.25);
});

test("Mixed: two streams, blended effective rate", () => {
  // 200k trading + 50k passive = 250k base.
  const r = computeCorporationTax({ tradingProfit: 200_000, passiveIncome: 50_000 });
  assert.equal(r.tradingTax, 25_000); // 200k × 12.5%
  assert.equal(r.passiveTax, 12_500); //  50k × 25%
  assert.equal(r.totalTax, 37_500);
  assert.equal(r.totalProfit, 250_000);
  assert.equal(r.effectiveRate, 37_500 / 250_000); // = 15%
});

test("Equal split: trading + passive blends to 18.75%", () => {
  const r = computeCorporationTax({ tradingProfit: 100_000, passiveIncome: 100_000 });
  assert.equal(r.totalTax, 37_500);
  assert.equal(r.effectiveRate, 0.1875);
});

test("Rounding: tax rounds to the cent", () => {
  const r = computeCorporationTax({ tradingProfit: 12_345.67, passiveIncome: 0 });
  assert.equal(r.tradingTax, 1_543.21); // 12,345.67 × 0.125 = 1,543.20875
});

test("Edge inputs: zero base gives no divide-by-zero", () => {
  const r = computeCorporationTax({ tradingProfit: 0, passiveIncome: 0 });
  assert.equal(r.totalTax, 0);
  assert.equal(r.effectiveRate, 0); // not NaN
});

test("Edge inputs: negatives clamp to zero", () => {
  const r = computeCorporationTax({ tradingProfit: -100_000, passiveIncome: -5_000 });
  assert.equal(r.tradingProfit, 0);
  assert.equal(r.passiveIncome, 0);
  assert.equal(r.totalTax, 0);
});

test("Rates are the documented statutory values", () => {
  assert.equal(CT_RATES.tradingPercent, 12.5);
  assert.equal(CT_RATES.passivePercent, 25);
});

test("CT_RATES is the same object as CT_CONFIG_DEFAULT (no drift)", () => {
  assert.equal(CT_RATES, CT_CONFIG_DEFAULT);
});

test("Custom config arg overrides the defaults", () => {
  // A hypothetical Budget: trading 15%, passive 30%.
  const r = computeCorporationTax(
    { tradingProfit: 100_000, passiveIncome: 100_000 },
    { tradingPercent: 15, passivePercent: 30 },
  );
  assert.equal(r.tradingTax, 15_000);
  assert.equal(r.passiveTax, 30_000);
  assert.equal(r.totalTax, 45_000);
});

test("parseCorporationTaxConfig: valid blob round-trips", () => {
  const cfg = parseCorporationTaxConfig({ tradingPercent: 10, passivePercent: 20 });
  assert.deepEqual(cfg, { tradingPercent: 10, passivePercent: 20 });
});

test("parseCorporationTaxConfig: rejects bad / out-of-range / missing", () => {
  assert.equal(parseCorporationTaxConfig(null), null);
  assert.equal(parseCorporationTaxConfig({ tradingPercent: 12.5 }), null); // missing passive
  assert.equal(parseCorporationTaxConfig({ tradingPercent: "12.5", passivePercent: 25 }), null); // string
  assert.equal(parseCorporationTaxConfig({ tradingPercent: 12.5, passivePercent: 250 }), null); // range
});
