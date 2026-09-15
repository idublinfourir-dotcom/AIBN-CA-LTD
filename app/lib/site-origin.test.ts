import test from "node:test";
import assert from "node:assert/strict";
import { resolveEmailOrigin } from "./site-origin.ts";

const canonical = "https://www.aibncharteredaccountants.ie";

test("production ignores the Origin header and uses the canonical host", () => {
  // The whole point: a confirmation link must not depend on the host the form
  // happened to be posted to.
  assert.equal(
    resolveEmailOrigin({
      canonical,
      isProduction: true,
      originHeader: "https://some-preview.vercel.app",
    }),
    canonical,
  );
});

test("development uses the Origin header, which is what you want locally", () => {
  assert.equal(
    resolveEmailOrigin({
      canonical,
      isProduction: false,
      originHeader: "http://localhost:3000",
    }),
    "http://localhost:3000",
  );
});

test("SITE_URL overrides both", () => {
  assert.equal(
    resolveEmailOrigin({
      configured: "https://staging.example.ie",
      canonical,
      isProduction: true,
      originHeader: "http://localhost:3000",
    }),
    "https://staging.example.ie",
  );
});

test("whitespace counts as unset", () => {
  assert.equal(
    resolveEmailOrigin({
      configured: "   ",
      canonical,
      isProduction: false,
      originHeader: "http://localhost:3000",
    }),
    "http://localhost:3000",
  );
});

test("development with no Origin header falls back to the canonical host", () => {
  assert.equal(
    resolveEmailOrigin({ canonical, isProduction: false, originHeader: null }),
    canonical,
  );
});

test("trailing slashes are stripped, so the link never doubles one", () => {
  assert.equal(
    resolveEmailOrigin({ configured: `${canonical}///`, canonical, isProduction: true }),
    canonical,
  );
});
