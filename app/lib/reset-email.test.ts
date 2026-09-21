import test from "node:test";
import assert from "node:assert/strict";
import { resetHtml, resetSubject, resetText } from "./reset-email.ts";

/* Eight digits, because that is what the live project actually issues: see
   CODE_SHAPE in app/forgot-password/actions.ts. The template is length-agnostic
   and the test below pins that, so this fixture is only a realistic sample. */
const base = {
  name: "Cian Murphy",
  code: "48392017",
  firmName: "AIBN Chartered Accountants Ltd",
};

test("both parts carry the code", () => {
  assert.match(resetText(base), /48392017/);
  assert.match(resetHtml(base), /48392017/);
});

test("the code stands alone on its own line in the text part", () => {
  // Mail clients and password managers pick the code out far more reliably
  // when nothing shares its line.
  assert.match(resetText(base), /\n48392017\n/);
});

test("the template states no digit count, at any length", () => {
  /* Supabase's OTP length is a dashboard setting. If the copy ever said "six
     digits" it would start lying the day that setting moved, so neither part
     names a number and both render whatever length they are handed. */
  for (const code of ["123456", "12345678", "1234567890"]) {
    const text = resetText({ ...base, code });
    const html = resetHtml({ ...base, code });
    assert.match(text, new RegExp(code));
    assert.match(html, new RegExp(code));
    /* Match the word itself, not spelled-out numbers: "eight" is a substring
       of line-height and font-weight in the inline CSS. No form of "digit"
       appears in either part, which is the property being pinned. */
    assert.doesNotMatch(text, /digit/i);
    assert.doesNotMatch(html, /digit/i);
  }
});

test("the subject says what the mail is for", () => {
  assert.equal(resetSubject(), "Your password reset code");
});

test("it carries no link at all", () => {
  // The whole point of the code flow: nothing to click, nothing to phish, and
  // it works on a different device from the one that asked.
  assert.doesNotMatch(resetHtml(base), /<a\s/i);
  assert.doesNotMatch(resetHtml(base), /https?:\/\//);
  assert.doesNotMatch(resetText(base), /https?:\/\//);
});

test("both parts state the same expiry window", () => {
  assert.match(resetText(base), /1 hour/);
  assert.match(resetHtml(base), /1 hour/);
});

test("both parts warn that nobody will ask for the code", () => {
  assert.match(resetText(base), /never ask you for this code/);
  assert.match(resetHtml(base), /never ask you for this code/);
});

test("someone who did not ask is told their password still works", () => {
  assert.match(resetText(base), /ignore this email/);
  assert.match(resetHtml(base), /current password keeps working/);
});

test("the name is escaped and falls back when empty", () => {
  assert.doesNotMatch(resetHtml({ ...base, name: "<b>x</b>" }), /<b>x<\/b>/);
  assert.match(resetText({ ...base, name: "   " }), /^Hi there,/);
});

test("the code is escaped even though Supabase only ever sends digits", () => {
  assert.doesNotMatch(resetHtml({ ...base, code: '"><script>' }), /<script>/);
});
