import test from "node:test";
import assert from "node:assert/strict";
import { ackHtml, ackSubject, ackText } from "./enquiry-email.ts";

const base = { name: "Cian Murphy", firmName: "AIBN Chartered Accountants Ltd" };

test("the subject says the enquiry arrived", () => {
  assert.equal(ackSubject(), "We've received your enquiry");
});

test("both parts make the same one-working-day promise", () => {
  assert.match(ackText(base), /within one working day/);
  assert.match(ackHtml(base), /within one working day/);
});

test("both parts greet by first name and sign off with the firm", () => {
  assert.match(ackText(base), /^Hi Cian,/);
  assert.match(ackHtml(base), /Hi Cian,/);
  assert.match(ackText(base), /AIBN Chartered Accountants Ltd$/);
});

test("the name is escaped and falls back when empty", () => {
  assert.doesNotMatch(ackHtml({ ...base, name: "<b>x</b>" }), /<b>/);
  assert.match(ackText({ ...base, name: "   " }), /^Hi there,/);
});
