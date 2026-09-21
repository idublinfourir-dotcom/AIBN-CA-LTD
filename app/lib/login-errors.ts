/* Maps a Supabase auth error code to copy we are willing to show a person.

   Why this exists: `app/login/actions.ts` used to return `error.message`
   straight onto the form. A provider's error text is not written for the
   person in front of us, it can leak internals, and when the API answers with
   a body the client cannot parse the message reaches the screen as the literal
   string "{}". Signup was fixed for exactly this (see app/signup/actions.ts);
   login had been left behind.

   Keyed on `code`, not on message text. Codes are a documented, stable part of
   the API (see @supabase/auth-js ErrorCode); the wording behind them is not,
   and matching on it breaks silently the day it changes.

   Measured against the live project on 2026-09-21: a wrong password, an
   address with no account, and a malformed address ALL come back as
   `invalid_credentials` / 400. So one shared message for those three does not
   invent an enumeration oracle, it preserves one Supabase already closed. Keep
   it that way: never give "no such account" its own wording here.

   Pure, no React or IO, unit-tested. Lives in lib rather than beside the action
   because a "use server" module may only export async server actions. */

/** Sign-in failed and we could not place the reason. Deliberately says nothing. */
const FALLBACK = "Couldn't sign you in. Please try again.";

export function loginErrorMessage(code?: string | null): string {
  switch (code) {
    /* Kept distinct and actionable on purpose. Collapsing this into the
       credentials message would strand anyone who signed up but never clicked
       the confirmation link: their details ARE right, and they would have no
       way to find out what is wrong. */
    case "email_not_confirmed":
      return "Please confirm your email first. Check your inbox for the link we sent, and your spam folder.";

    /* The three-in-one case: wrong password, no such account, unparseable
       address. One message for all of them, by design. */
    case "invalid_credentials":
      return "That email and password don't match an account.";

    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many sign-in attempts. Please wait a minute and try again.";

    case "user_banned":
      return "This account can't be used to sign in. Please contact us and we'll sort it out.";

    /* Provider or project misconfiguration: real, but nothing the person at the
       keyboard can act on, and the specifics are ours to read in the log. */
    case "signup_disabled":
    case "provider_disabled":
    case "email_provider_disabled":
      return FALLBACK;

    default:
      return FALLBACK;
  }
}
