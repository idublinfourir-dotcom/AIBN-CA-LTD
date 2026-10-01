import test from "node:test";
import assert from "node:assert/strict";
import { emailDocument, escapeHtml, greetingName, paragraph } from "./email-layout.ts";

test("escapeHtml covers all five significant characters", () => {
  assert.equal(escapeHtml(`<a href="x">Tom & Jerry's</a>`),
    "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");
});

test("greetingName takes the first name and falls back to 'there'", () => {
  assert.equal(greetingName("  Cian   Murphy "), "Cian");
  assert.equal(greetingName(""), "there");
});

test("the document escapes the firm name in its header bar", () => {
  const html = emailDocument("A & <B>", []);
  assert.match(html, /A &amp; &lt;B&gt;<\/span>/);
});

test("blocks render in order inside the card", () => {
  const html = emailDocument("Firm", [paragraph("first"), paragraph("second")]);
  assert.ok(html.indexOf(">first<") < html.indexOf(">second<"));
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<\/html>$/);
});
