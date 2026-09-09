/* Unit tests for diffRecords. Run: node --test app/lib/rate-diff.test.ts */

import { test } from "node:test";
import assert from "node:assert/strict";
import { diffRecords } from "./rate-diff.ts";

test("flags changed vs unchanged fields", () => {
  const d = diffRecords(
    { rate: 33, exemption: 1270 },
    { rate: 35, exemption: 1270 },
    [
      { key: "rate", label: "Standard rate" },
      { key: "exemption", label: "Exemption" },
    ],
  );
  assert.equal(d[0].kind, "changed");
  assert.equal(d[0].from, "33");
  assert.equal(d[0].to, "35");
  assert.equal(d[1].kind, "unchanged");
});

test("uses a formatter and handles a null placeholder", () => {
  const d = diffRecords({ cap: 1_000_000 }, { cap: null }, [
    { key: "cap", label: "Cap", format: (v) => (v === null || v === undefined ? "n/a" : `€${v}`) },
  ]);
  assert.equal(d[0].from, "€1000000");
  assert.equal(d[0].to, "n/a");
  assert.equal(d[0].kind, "changed");
});
