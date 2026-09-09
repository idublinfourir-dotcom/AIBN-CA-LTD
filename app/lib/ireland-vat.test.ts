/* Unit tests for the Ireland VAT engine.
   Run: node --test app/lib/ireland-vat.test.ts   (Node 22.6+ strips types)

   Covers add/remove at every rate, the net + vat === gross reconciliation
   guarantee, and zero / negative edge inputs. */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addVat,
  removeVat,
  vatPosition,
  round2,
  VAT_RATES,
  VAT_CONFIG_DEFAULT,
  getVatRate,
  parseVatConfig,
  type VatBreakdown,
} from "./ireland-vat.ts";

/* The core promise: the three figures always reconcile to the cent. */
function assertReconciles(b: VatBreakdown) {
  assert.equal(round2(b.net + b.vat), b.gross, "net + vat must equal gross");
}

test("Add VAT: €100 net at each statutory rate", () => {
  assert.deepEqual(addVat(100, 23), { net: 100, vat: 23, gross: 123, percent: 23 });
  assert.deepEqual(addVat(100, 13.5), { net: 100, vat: 13.5, gross: 113.5, percent: 13.5 });
  assert.deepEqual(addVat(100, 9), { net: 100, vat: 9, gross: 109, percent: 9 });
  assert.deepEqual(addVat(100, 4.8), { net: 100, vat: 4.8, gross: 104.8, percent: 4.8 });
  assert.deepEqual(addVat(100, 0), { net: 100, vat: 0, gross: 100, percent: 0 });
});

test("Remove VAT: inverse of Add VAT at each rate returns €100 net", () => {
  assert.deepEqual(removeVat(123, 23), { net: 100, vat: 23, gross: 123, percent: 23 });
  assert.deepEqual(removeVat(113.5, 13.5), { net: 100, vat: 13.5, gross: 113.5, percent: 13.5 });
  assert.deepEqual(removeVat(109, 9), { net: 100, vat: 9, gross: 109, percent: 9 });
  assert.deepEqual(removeVat(104.8, 4.8), { net: 100, vat: 4.8, gross: 104.8, percent: 4.8 });
  assert.deepEqual(removeVat(100, 0), { net: 100, vat: 0, gross: 100, percent: 0 });
});

test("Rounding reconciles to the cent: awkward amounts", () => {
  // 100 gross @ 23% → net 81.30, vat 18.70 (derived by subtraction).
  const r = removeVat(100, 23);
  assert.equal(r.net, 81.3);
  assert.equal(r.vat, 18.7);
  assertReconciles(r);

  // 99.99 net @ 23% → vat 23.00, gross 122.99.
  const a = addVat(99.99, 23);
  assert.equal(a.vat, 23);
  assert.equal(a.gross, 122.99);
  assertReconciles(a);
});

test("Reconciliation holds for every rate, both directions", () => {
  for (const rate of VAT_RATES) {
    assertReconciles(addVat(1234.56, rate.percent));
    assertReconciles(removeVat(1234.56, rate.percent));
    assertReconciles(addVat(0.01, rate.percent));
    assertReconciles(removeVat(0.01, rate.percent));
  }
});

test("Edge inputs: zero and negative clamp to zero", () => {
  assert.deepEqual(addVat(0, 23), { net: 0, vat: 0, gross: 0, percent: 23 });
  assert.deepEqual(removeVat(0, 23), { net: 0, vat: 0, gross: 0, percent: 23 });
  assert.deepEqual(addVat(-500, 23), { net: 0, vat: 0, gross: 0, percent: 23 });
  assert.deepEqual(removeVat(-500, 23), { net: 0, vat: 0, gross: 0, percent: 23 });
});

test("Net position: more output than input VAT → payable to Revenue", () => {
  assert.deepEqual(vatPosition(2_000, 500), {
    outputVat: 2_000,
    inputVat: 500,
    netVat: 1_500,
    direction: "payable",
  });
});

test("Net position: more input than output VAT → receivable from Revenue", () => {
  // Paid €2.5M VAT on purchases, charged €2M on sales → €0.5M back.
  assert.deepEqual(vatPosition(2_000_000, 2_500_000), {
    outputVat: 2_000_000,
    inputVat: 2_500_000,
    netVat: 500_000,
    direction: "receivable",
  });
});

test("Net position: equal totals balance to zero", () => {
  assert.deepEqual(vatPosition(1_234.56, 1_234.56), {
    outputVat: 1_234.56,
    inputVat: 1_234.56,
    netVat: 0,
    direction: "balanced",
  });
});

test("Net position: composed from add/remove VAT, nets to the cent", () => {
  // Sold €10,000 net @ 23%; bought €5,000 gross @ 13.5%.
  const output = addVat(10_000, 23).vat; // 2,300.00
  const input = removeVat(5_000, 13.5).vat; // 594.71
  const pos = vatPosition(output, input);
  assert.equal(pos.netVat, round2(output - input));
  assert.equal(pos.netVat, 1_705.29);
  assert.equal(pos.direction, "payable");
});

test("Net position: zero and negative inputs clamp to zero", () => {
  assert.deepEqual(vatPosition(0, 0), {
    outputVat: 0,
    inputVat: 0,
    netVat: 0,
    direction: "balanced",
  });
  assert.deepEqual(vatPosition(-100, 250), {
    outputVat: 0,
    inputVat: 250,
    netVat: 250,
    direction: "receivable",
  });
});

test("round2 absorbs binary-float error", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

test("Rate table is the single source of truth", () => {
  assert.equal(getVatRate("standard").percent, 23);
  assert.equal(getVatRate("second-reduced").percent, 9);
  assert.throws(() => getVatRate("nope" as never));
});

test("VAT_RATES is derived from VAT_CONFIG_DEFAULT (no drift)", () => {
  assert.equal(VAT_RATES, VAT_CONFIG_DEFAULT.rates);
});

test("getVatRate resolves against a passed-in rate table", () => {
  const custom = structuredClone(VAT_CONFIG_DEFAULT).rates;
  custom[0].percent = 24;
  assert.equal(getVatRate("standard", custom).percent, 24);
});

test("parseVatConfig: the code default round-trips", () => {
  const cfg = parseVatConfig(structuredClone(VAT_CONFIG_DEFAULT));
  assert.notEqual(cfg, null);
  if (cfg) {
    assert.equal(cfg.rates.length, 5);
    assert.equal(cfg.thresholds.goods, 85_000);
  }
});

test("parseVatConfig: rejects bad blobs", () => {
  assert.equal(parseVatConfig(null), null);
  assert.equal(parseVatConfig({ rates: [], thresholds: { goods: 1, services: 1, since: "x" } }), null); // missing keys
  const missingThreshold = structuredClone(VAT_CONFIG_DEFAULT) as unknown as Record<string, unknown>;
  delete missingThreshold.thresholds;
  assert.equal(parseVatConfig(missingThreshold), null);
  const badPct = structuredClone(VAT_CONFIG_DEFAULT);
  badPct.rates[0].percent = 250;
  assert.equal(parseVatConfig(badPct), null);
});
