import test from "node:test";
import assert from "node:assert/strict";
import { loginErrorMessage } from "./login-errors.ts";

test("an unconfirmed account gets its own actionable message", () => {
  const msg = loginErrorMessage("email_not_confirmed");
  assert.match(msg, /confirm your email/i);
  assert.match(msg, /spam/i);
  // It must not be the credentials message: their details are correct.
  assert.notEqual(msg, loginErrorMessage("invalid_credentials"));
});

test("wrong password, unknown account and bad address share one message", () => {
  /* All three really do return invalid_credentials from Supabase (verified
     against the live project), so one code means one message and the form
     cannot be used to discover which addresses have accounts. */
  const msg = loginErrorMessage("invalid_credentials");
  assert.match(msg, /don't match an account/);
  assert.doesNotMatch(msg, /password is wrong|no account|not found|doesn't exist/i);
});

test("throttling tells the user to wait", () => {
  assert.match(loginErrorMessage("over_request_rate_limit"), /wait a minute/i);
  assert.match(loginErrorMessage("over_email_send_rate_limit"), /wait a minute/i);
});

test("a banned account is told to get in touch, not why", () => {
  const msg = loginErrorMessage("user_banned");
  assert.match(msg, /contact us/i);
  assert.doesNotMatch(msg, /banned|suspended|blocked/i);
});

test("misconfiguration and unknown codes fall back to the same neutral line", () => {
  const fallback = loginErrorMessage("something_we_have_never_seen");
  assert.equal(loginErrorMessage("signup_disabled"), fallback);
  assert.equal(loginErrorMessage("provider_disabled"), fallback);
  assert.equal(loginErrorMessage(undefined), fallback);
  assert.equal(loginErrorMessage(null), fallback);
  assert.match(fallback, /Couldn't sign you in/);
});

test("no message ever leaks provider wording or internals", () => {
  const codes = [
    "email_not_confirmed", "invalid_credentials", "over_request_rate_limit",
    "over_email_send_rate_limit", "user_banned", "signup_disabled",
    "provider_disabled", "email_provider_disabled", undefined, null, "", "{}",
  ];
  for (const c of codes) {
    const msg = loginErrorMessage(c as string);
    assert.ok(msg.length > 0, `empty message for ${c}`);
    // The exact symptom that prompted the signup fix.
    assert.notEqual(msg, "{}");
    assert.doesNotMatch(msg, /\{|\}|AuthApiError|supabase|gotrue|400|500/i);
  }
});
