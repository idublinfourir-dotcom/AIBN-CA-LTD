/* The signup confirmation link, composed and sent by THIS app rather than by
   Supabase.

   Supabase can mail this itself, but only through the project's custom SMTP
   panel and an email template edited in a dashboard, where the wording is not
   reviewable, not diffable, and a bad setting fails as an opaque 500 with the
   user rolled back. The firm already has working SMTP for its enquiry and
   reply mail, so signup uses that instead: see generateLink in
   app/signup/actions.ts, which produces the token WITHOUT Supabase sending
   anything.

   The frame and its email-client constraints live in email-layout.ts. Pure:
   composes strings, sends nothing. */

import {
  button,
  emailDocument,
  escapeHtml,
  finePrint,
  greeting,
  greetingName,
  INK,
  paragraph,
  signOff,
} from "./email-layout.ts";

export interface ConfirmEmailInput {
  /** The name they gave at signup, for the greeting. */
  name: string;
  /** Absolute /auth/confirm URL carrying the single-use token hash. */
  verifyUrl: string;
  firmName: string;
}

export function confirmSubject(): string {
  return "Confirm your email address";
}

/** Stated in both parts so the two cannot drift. Supabase expires these links
    after 24 hours by default; change this if that setting changes. */
const EXPIRY_LINE = "The link is good for 24 hours and can be used once.";

export function confirmText(input: ConfirmEmailInput): string {
  return [
    `Hi ${greetingName(input.name)},`,
    "",
    "Confirm your email address to finish setting up your client account:",
    input.verifyUrl,
    "",
    EXPIRY_LINE,
    "If you didn't ask for an account, ignore this email and nothing happens.",
    "",
    input.firmName,
  ].join("\n");
}

export function confirmHtml(input: ConfirmEmailInput): string {
  // Not escaped as HTML text: this app builds it from its own origin and a
  // token hash, never from user input. Do not start passing arbitrary URLs in.
  const href = input.verifyUrl;

  return emailDocument(input.firmName, [
    greeting(input.name),
    paragraph("Confirm your email address to finish setting up your client account."),
    button(href, "Confirm my email"),
    finePrint(
      `Or paste this into your browser:<br><a href="${href}" style="color:${INK}">${escapeHtml(href)}</a>`,
    ),
    paragraph(
      `${EXPIRY_LINE} If you didn&#39;t ask for an account, ignore this email and nothing happens.`,
    ),
    signOff(input.firmName),
  ]);
}
