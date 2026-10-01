import test from "node:test";
import assert from "node:assert/strict";
import { replyHtml, replySubject, replyText } from "./reply-email.ts";

const base = {
  clientName: "Aoife Byrne",
  body: "Thanks for the figures.\nAll received.\n\nWe'll be in touch on Friday.",
  service: "Payroll",
  firmName: "AIBN Chartered Accountants Ltd",
};

test("the subject replies to what the enquiry was about", () => {
  assert.equal(replySubject(base), "Re: Payroll");
  assert.equal(replySubject({ ...base, service: null }), "Re: your enquiry");
  assert.equal(replySubject({ ...base, service: "  " }), "Re: your enquiry");
});

test("the text part carries exactly what the admin typed", () => {
  assert.equal(
    replyText(base),
    `Hi Aoife,\n\n${base.body}\n\nAIBN Chartered Accountants Ltd`,
  );
});

test("the HTML keeps the admin's paragraphs and line breaks", () => {
  const html = replyHtml(base);
  assert.match(html, /Thanks for the figures\.<br>All received\.<\/p>/);
  assert.match(html, /<p [^>]*>We&#39;ll be in touch on Friday\.<\/p>/);
});

test("nothing is appended: no link, no quoted enquiry", () => {
  assert.doesNotMatch(replyHtml(base), /href=/);
});

test("the body and name are escaped", () => {
  const html = replyHtml({ ...base, clientName: "<i>A</i>", body: "<script>x</script>" });
  assert.doesNotMatch(html, /<script>|<i>/);
  assert.match(html, /&lt;script&gt;/);
});
