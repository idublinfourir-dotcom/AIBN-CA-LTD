/* Unit tests for the Working Capital engine.
   Run: node --test app/lib/working-capital.test.ts   (Node 22.6+ strips types)

   Covers surplus / deficit / balanced, the current and quick ratios, the
   divide-by-zero guard when there are no liabilities, inventory capping, and
   edge inputs. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWorkingCapital } from "./working-capital.ts";

test("Surplus: assets exceed liabilities", () => {
  const r = computeWorkingCapital({
    currentAssets: 200_000,
    currentLiabilities: 100_000,
    inventory: 50_000,
  });
  assert.equal(r.workingCapital, 100_000);
  assert.equal(r.direction, "surplus");
  assert.equal(r.currentRatio, 2); // 200k / 100k
  assert.equal(r.quickRatio, 1.5); // (200k − 50k) / 100k
});

test("Deficit: liabilities exceed assets", () => {
  const r = computeWorkingCapital({ currentAssets: 80_000, currentLiabilities: 100_000 });
  assert.equal(r.workingCapital, -20_000);
  assert.equal(r.direction, "deficit");
  assert.equal(r.currentRatio, 0.8);
});

test("Balanced: assets equal liabilities", () => {
  const r = computeWorkingCapital({ currentAssets: 100_000, currentLiabilities: 100_000 });
  assert.equal(r.workingCapital, 0);
  assert.equal(r.direction, "balanced");
  assert.equal(r.currentRatio, 1);
});

test("No current liabilities: ratios are null (no divide-by-zero)", () => {
  const r = computeWorkingCapital({ currentAssets: 50_000, currentLiabilities: 0 });
  assert.equal(r.workingCapital, 50_000);
  assert.equal(r.direction, "surplus");
  assert.equal(r.currentRatio, null);
  assert.equal(r.quickRatio, null);
});

test("Quick ratio excludes inventory; inventory can't exceed current assets", () => {
  const r = computeWorkingCapital({
    currentAssets: 100_000,
    currentLiabilities: 50_000,
    inventory: 250_000, // absurd, capped at current assets
  });
  assert.equal(r.inventory, 100_000);
  assert.equal(r.quickRatio, 0); // (100k − 100k) / 50k
  assert.equal(r.currentRatio, 2);
});

test("Ratios round to 2dp", () => {
  const r = computeWorkingCapital({ currentAssets: 100_000, currentLiabilities: 30_000 });
  assert.equal(r.currentRatio, 3.33); // 100/30 = 3.333…
});

test("Edge inputs: zero and negatives clamp to zero", () => {
  const z = computeWorkingCapital({ currentAssets: 0, currentLiabilities: 0 });
  assert.equal(z.workingCapital, 0);
  assert.equal(z.direction, "balanced");
  assert.equal(z.currentRatio, null);

  const neg = computeWorkingCapital({ currentAssets: -10_000, currentLiabilities: -5_000 });
  assert.equal(neg.currentAssets, 0);
  assert.equal(neg.currentLiabilities, 0);
  assert.equal(neg.workingCapital, 0);
});
