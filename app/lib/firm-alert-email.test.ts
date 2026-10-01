import test from "node:test";
import assert from "node:assert/strict";
import {
  clientMessageAlert,
  enquiryAlert,
  oneLine,
  toolkitRequestAlert,
} from "./firm-alert-email.ts";

const origin = "https://www.aibncharteredaccountants.ie";
const firmName = "AIBN Chartered Accountants Ltd";

const enquiry = {
  enquiryId: "42",
  name: "Cian Murphy",
  email: "cian@example.com",
  company: "Murphy Joinery",
  service: "Audit & assurance",
  message: "We need an audit.\n\nYear end is March.",
  origin,
  firmName,
};

test("the enquiry alert names the sender and the service in the subject", () => {
  assert.equal(
    enquiryAlert(enquiry).subject,
    "New enquiry from Cian Murphy: Audit & assurance",
  );
  assert.equal(
    enquiryAlert({ ...enquiry, service: null }).subject,
    "New enquiry from Cian Murphy",
  );
});

test("both parts link to that enquiry in the admin portal", () => {
  const alert = enquiryAlert(enquiry);
  const url = `${origin}/admin/enquiries?id=42`;
  assert.ok(alert.text.includes(url));
  assert.ok(alert.html.includes(`href="${url}"`));
});

test("both parts carry every detail and the whole message", () => {
  const { text, html } = enquiryAlert(enquiry);
  for (const value of ["cian@example.com", "Murphy Joinery", "Year end is March."]) {
    assert.ok(text.includes(value), value);
    assert.ok(html.includes(value), value);
  }
  assert.ok(text.includes("We need an audit.\n\nYear end is March."));
  // Paragraph breaks survive into the HTML as separate paragraphs.
  assert.match(html, /We need an audit\.<\/p><p [^>]*>Year end is March\./);
});

test("both parts say to reply from the portal, not from the email", () => {
  const { text, html } = enquiryAlert(enquiry);
  assert.match(text, /Reply from the admin portal/);
  assert.match(html, /Reply from the admin portal/);
});

test("both parts say a follow-up won't alert again until it is opened", () => {
  const { text, html } = enquiryAlert(enquiry);
  assert.match(text, /won't send another alert/);
  assert.match(html, /won&#39;t send another alert/);
});

test("optional details that were left blank are left out", () => {
  const { text, html } = enquiryAlert({ ...enquiry, company: null, service: "  " });
  assert.doesNotMatch(text, /Company:|Service:/);
  assert.doesNotMatch(html, />Company<|>Service</);
});

test("everything a visitor typed is escaped in the HTML", () => {
  const hostile = "<script>alert(1)</script>";
  const { html } = enquiryAlert({
    ...enquiry,
    name: hostile,
    email: hostile,
    company: hostile,
    service: hostile,
    message: hostile,
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("a typed line break or a long name cannot reshape the subject", () => {
  const { subject } = enquiryAlert({
    ...enquiry,
    name: "Cian\r\nBcc: someone@example.com",
    service: "x".repeat(300),
  });
  assert.doesNotMatch(subject, /[\r\n]/);
  assert.ok(subject.length <= 200, `subject is ${subject.length} chars`);
});

test("oneLine flattens whitespace and caps with an ellipsis", () => {
  assert.equal(oneLine("  a \n\t b  "), "a b");
  assert.equal(oneLine("abcdef", 4), "abc…");
  assert.equal(oneLine("abcd", 4), "abcd");
});

test("the client message alert links to the conversation", () => {
  const alert = clientMessageAlert({
    enquiryId: "7",
    clientName: "Aoife Byrne",
    clientEmail: "aoife@example.com",
    service: "Payroll",
    message: "Here are the March figures.",
    origin,
    firmName,
  });
  assert.equal(alert.subject, "New message from Aoife Byrne: Payroll");
  assert.ok(alert.text.includes(`${origin}/admin/enquiries?id=7`));
  assert.ok(alert.html.includes("Here are the March figures."));
  assert.match(alert.text, /Reply from the admin portal/);
});

test("a client message on an enquiry with no service still says what it is about", () => {
  const { subject, text } = clientMessageAlert({
    enquiryId: "7",
    clientName: "Aoife Byrne",
    clientEmail: "aoife@example.com",
    service: null,
    message: "Hello again.",
    origin,
    firmName,
  });
  assert.equal(subject, "New message from Aoife Byrne");
  assert.match(text, /Enquiry: General enquiry/);
});

test("the Founders Hub alert names the resource and points at the request list", () => {
  const alert = toolkitRequestAlert({
    resourceTitle: "VAT registration memo",
    name: "Sean Kelly",
    email: "sean@example.com",
    phone: "+353 1 234 5678",
    website: "https://kelly.ie/",
    purpose: "Registering for VAT next month.",
    origin,
    firmName,
  });
  assert.equal(alert.subject, "Founders Hub request from Sean Kelly: VAT registration memo");
  assert.ok(alert.text.includes(`${origin}/admin/toolkits`));
  assert.match(alert.text, /What they need it for:\nRegistering for VAT next month\./);
  assert.match(alert.text, /Mark sent/);
  // Its next step is sending a file, so it carries no "reply in the portal" line.
  assert.doesNotMatch(alert.text, /Reply from the admin portal/);
});
