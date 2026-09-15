import test from "node:test";
import assert from "node:assert/strict";
import { confirmHtml, confirmSubject, confirmText } from "./signup-email.ts";

const base = {
  name: "Cian Murphy",
  verifyUrl:
    "https://www.aibncharteredaccountants.ie/auth/confirm?token_hash=abc123&type=email",
  firmName: "AIBN Chartered Accountants Ltd",
};

test("both parts carry the confirmation link", () => {
  assert.match(confirmText(base), /token_hash=abc123&type=email/);
  assert.match(confirmHtml(base), /token_hash=abc123&amp;type=email|token_hash=abc123&type=email/);
});

test("the HTML repeats the URL for clients that drop the anchor", () => {
  // Once in the button href, once in the fallback href, once as visible text.
  assert.equal(confirmHtml(base).match(/token_hash=abc123/g)?.length, 3);
});

test("the subject says what the mail is for", () => {
  assert.equal(confirmSubject(), "Confirm your email address");
});

test("both parts state the same expiry window", () => {
  assert.match(confirmText(base), /24 hours/);
  assert.match(confirmHtml(base), /24 hours/);
});

test("someone who did not sign up is told to ignore it", () => {
  assert.match(confirmText(base), /ignore this email/);
  assert.match(confirmHtml(base), /ignore this email/);
});

test("the name is escaped and falls back when empty", () => {
  assert.doesNotMatch(confirmHtml({ ...base, name: "<b>x</b>" }), /<b>/);
  assert.match(confirmText({ ...base, name: "   " }), /^Hi there,/);
});
