/* Unit tests for VAT guardrails.
   Run: node --test app/lib/vat-guardrails.test.ts   (Node 22.6+ strips types) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateVatConfig, type RawVatConfig } from "./vat-guardrails.ts";
import { VAT_CONFIG_DEFAULT } from "./ireland-vat.ts";

const valid = (): RawVatConfig => structuredClone(VAT_CONFIG_DEFAULT) as RawVatConfig;

test("accepts the statutory defaults", () => {
  const r = validateVatConfig(valid());
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.rates.length, 5);
    assert.equal(r.value.thresholds.goods, 85_000);
  }
});

test("rejects an out-of-range percent", () => {
  const c = valid();
  c.rates[0].percent = 150;
  assert.equal(validateVatConfig(c).ok, false);
});

test("rejects a missing statutory rate key", () => {
  const c = valid();
  c.rates = c.rates.filter((r) => r.key !== "zero");
  assert.equal(validateVatConfig(c).ok, false);
});

test("rejects an extra/unknown rate row", () => {
  const c = valid();
  c.rates.push({ key: "made-up" as never, percent: 5, label: "x", applies: "y" });
  assert.equal(validateVatConfig(c).ok, false);
});

test("rejects a negative threshold", () => {
  const c = valid();
  c.thresholds.services = -1;
  assert.equal(validateVatConfig(c).ok, false);
});

test("rejects an empty 'since' label", () => {
  const c = valid();
  c.thresholds.since = "   ";
  assert.equal(validateVatConfig(c).ok, false);
});

test("trims labels and applies", () => {
  const c = valid();
  c.rates[0].label = "  Standard 23%  ";
  const r = validateVatConfig(c);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.rates[0].label, "Standard 23%");
});
