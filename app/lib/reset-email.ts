/* The password-reset code, composed and sent by THIS app rather than by
   Supabase.

   Same reasoning as signup-email.ts: Supabase can mail this itself, but only
   through the dashboard's custom SMTP panel and a template edited in a web UI,
   where the wording is neither reviewable nor diffable and a bad setting fails
   as an opaque 500. The firm's own SMTP already carries the enquiry, reply and
   signup mail, so this uses it too. See generateLink in
   app/forgot-password/actions.ts, which produces the code WITHOUT Supabase
   sending anything.

   This one deliberately carries NO link. A code typed into the form
   works from a different device than the one that asked for it, which the
   signup action_link cannot do (it comes back as a PKCE code bound to the
   requesting browser). It also keeps /auth/confirm narrowed to type=email.

   The frame and its email-client constraints live in email-layout.ts. Pure,
   composes strings and sends nothing. */

import {
  emailDocument,
  escapeHtml,
  finePrint,
  greeting,
  greetingName,
  INK,
  paragraph,
  RULE,
  signOff,
  WASH,
} from "./email-layout.ts";

export interface ResetEmailInput {
  /** The account's display name, for the greeting. May be empty. */
  name: string;
  /* The code from generateLink's `email_otp`. Never a URL, and never assumed
     to be any particular length: see CODE_SHAPE in
     app/forgot-password/actions.ts. Nothing in this template states a digit
     count, so a change to the project's OTP length cannot make the copy lie. */
  code: string;
  firmName: string;
}

export function resetSubject(): string {
  return "Your password reset code";
}

/* Stated in both parts so the two cannot drift. Mirrors the project's
   Authentication -> Email OTP Expiration setting (Supabase ships 3600s).
   That setting is dashboard-only, so if it changes, change this line with it. */
const EXPIRY_LINE = "The code is good for 1 hour and can be used once.";

/* Reset mail is the most impersonated message a firm sends, so it says outright
   that nobody here will ever ask for the code. */
const PHISHING_LINE = "We will never ask you for this code. Nobody here needs it.";

const IGNORE_LINE =
  "If you didn't ask to reset your password, ignore this email: nothing changes and your current password keeps working.";

export function resetText(input: ResetEmailInput): string {
  return [
    `Hi ${greetingName(input.name)},`,
    "",
    "Here is the code to reset your password:",
    "",
    input.code,
    "",
    "Type it into the form you started on our site, along with your new password.",
    "",
    EXPIRY_LINE,
    PHISHING_LINE,
    IGNORE_LINE,
    "",
    input.firmName,
  ].join("\n");
}

export function resetHtml(input: ResetEmailInput): string {
  const code = escapeHtml(input.code);

  return emailDocument(input.firmName, [
    greeting(input.name),
    paragraph(
      "Here is the code to reset your password. Type it into the form you started on our site, along with your new password.",
    ),
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
  <tr>
    <td style="background:${WASH};border:1px solid ${RULE};padding:16px 24px">
      <span style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:0.18em;color:${INK}">${code}</span>
    </td>
  </tr>
</table>`,
    paragraph(`${EXPIRY_LINE} ${PHISHING_LINE}`),
    finePrint(IGNORE_LINE),
    signOff(input.firmName),
  ]);
}
