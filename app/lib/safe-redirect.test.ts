import test from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./safe-redirect.ts";

test("ordinary site paths pass through, query and hash included", () => {
  assert.equal(safeNextPath("/portal"), "/portal");
  assert.equal(safeNextPath("/admin/enquiries"), "/admin/enquiries");
  assert.equal(safeNextPath("/portal?thread=12#latest"), "/portal?thread=12#latest");
});

test("missing or non-path values are refused", () => {
  assert.equal(safeNextPath(null), null);
  assert.equal(safeNextPath(undefined), null);
  assert.equal(safeNextPath(""), null);
  assert.equal(safeNextPath("portal"), null);
  assert.equal(safeNextPath("https://evil.example/"), null);
  assert.equal(safeNextPath("javascript:alert(1)"), null);
});

test("protocol-relative URLs are refused", () => {
  assert.equal(safeNextPath("//evil.example"), null);
  assert.equal(safeNextPath("//evil.example/portal"), null);
});

test("a backslash after the leading slash is refused", () => {
  /* The bug this module exists for: the old prefix check passed this, and the
     browser resolved it to https://evil.example/. */
  assert.equal(safeNextPath("/\\evil.example"), null);
  assert.equal(safeNextPath("\\\\evil.example"), null);
});

test("tabs and newlines the browser strips cannot hide a second slash", () => {
  assert.equal(safeNextPath("/\t/evil.example"), null);
  assert.equal(safeNextPath("/\n/evil.example"), null);
  assert.equal(safeNextPath("/\r/evil.example"), null);
});

test("dot segments cannot normalise into a protocol-relative path", () => {
  assert.equal(safeNextPath("/.//evil.example"), null);
  assert.equal(safeNextPath("/portal/..//evil.example"), null);
});

test("encoded slashes stay a harmless on-site path", () => {
  // Never decoded into a separator, so they cannot change the host.
  assert.equal(safeNextPath("/%2F/evil.example"), "/%2F/evil.example");
  assert.equal(safeNextPath("/%5Cevil.example"), "/%5Cevil.example");
});
