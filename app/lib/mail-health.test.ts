import test from "node:test";
import assert from "node:assert/strict";
import {
  describeSmtpError,
  explainMailFailure,
  MAIL_KIND_LABELS,
  mailEnvironment,
  mailKindLabel,
  missingMailKeys,
  safeAdminHref,
} from "./mail-health.ts";

test("no SMTP settings at all reports all three required keys", () => {
  // The production state until 3 Nov 2026: this is the case the warning is for.
  assert.deepEqual(missingMailKeys({}), ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]);
});

test("a complete config reports nothing missing; optional keys are not required", () => {
  assert.deepEqual(
    missingMailKeys({ SMTP_HOST: "smtp.zoho.com", SMTP_USER: "info@x.ie", SMTP_PASS: "p" }),
    [],
  );
});

test("a blank or whitespace value counts as missing", () => {
  assert.deepEqual(
    missingMailKeys({ SMTP_HOST: "smtp.zoho.com", SMTP_USER: "  ", SMTP_PASS: "" }),
    ["SMTP_USER", "SMTP_PASS"],
  );
});

test("failures are scoped to the deployment that had them", () => {
  assert.equal(mailEnvironment({ VERCEL_ENV: "production" }), "production");
  assert.equal(mailEnvironment({ VERCEL_ENV: "preview" }), "preview");
  // Dev, e2e and anything off Vercel: must never be read as production.
  assert.equal(mailEnvironment({}), "local");
  assert.equal(mailEnvironment({ VERCEL_ENV: " " }), "local");
});

test("a refused send keeps the code and the server's reply", () => {
  const err = Object.assign(new Error("Invalid login: 535 Authentication Failed"), {
    code: "EAUTH",
    response: "535 Authentication Failed",
    responseCode: 535,
  });
  assert.equal(describeSmtpError(err), "EAUTH: 535 Authentication Failed");
});

test("every email address in the detail is replaced, so the log holds none", () => {
  const err = Object.assign(new Error("Can't send mail"), {
    code: "EENVELOPE",
    response: "550 5.1.1 <jane.doe+tax@example.com>: Recipient address rejected (from info@firm.ie)",
  });
  const out = describeSmtpError(err);
  assert.equal(
    out,
    "EENVELOPE: 550 5.1.1 <[address]>: Recipient address rejected (from [address])",
  );
  assert.doesNotMatch(out, /@/);
});

test("without a server reply the message is used, and odd inputs still give a line", () => {
  const err = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:2526"), {
    code: "ESOCKET",
  });
  assert.equal(describeSmtpError(err), "ESOCKET: connect ECONNREFUSED 127.0.0.1:2526");
  assert.equal(describeSmtpError("boom"), "boom");
  assert.equal(describeSmtpError(undefined), "Unknown error");
  assert.equal(describeSmtpError({}), "Unknown error");
});

test("the detail is one capped line", () => {
  const err = { response: `554 ${"x".repeat(1000)}\n\nsecond line` };
  const out = describeSmtpError(err);
  assert.ok(out.length <= 300, `length ${out.length}`);
  assert.ok(out.endsWith("…"));
  assert.doesNotMatch(out, /\n/);
});

test("each failure gets a plain-English reason picked by its code", () => {
  assert.match(explainMailFailure("not_configured", null), /settings were missing/);
  assert.match(explainMailFailure("refused", "EAUTH: 535 Authentication Failed"), /refused the login/);
  assert.match(explainMailFailure("refused", "ESOCKET: connect ECONNREFUSED"), /could not be reached/);
  assert.match(explainMailFailure("refused", "ETIMEDOUT: Connection timeout"), /could not be reached/);
  assert.match(explainMailFailure("refused", "EENVELOPE: 550 rejected"), /recipient's address/);
  assert.match(explainMailFailure("refused", "EMESSAGE: 554 spam"), /refused the message/);
  assert.match(explainMailFailure("refused", null), /refused the message/);
});

test("every kind has its own label, and an unknown one still reads sensibly", () => {
  const labels = Object.values(MAIL_KIND_LABELS);
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(mailKindLabel("client-reply"), "Your reply, emailed to the client");
  assert.equal(mailKindLabel("something-new"), "Email");
});

test("only a path inside /admin is ever linked", () => {
  assert.equal(safeAdminHref("/admin/enquiries?id=40"), "/admin/enquiries?id=40");
  assert.equal(safeAdminHref("/admin/toolkits"), "/admin/toolkits");
  assert.equal(safeAdminHref("/admin"), "/admin");
  assert.equal(safeAdminHref("/administrator"), null);
  assert.equal(safeAdminHref("//evil.example/admin"), null);
  assert.equal(safeAdminHref("https://evil.example/admin"), null);
  assert.equal(safeAdminHref("/portal"), null);
  assert.equal(safeAdminHref(null), null);
});
