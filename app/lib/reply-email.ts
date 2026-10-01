/* The admin-reply email, composed in this repo rather than in a provider's
   dashboard, so the layout is reviewable, diffable and changed in a commit.

   Deliberately minimal: a greeting, exactly what the admin typed, and the firm
   name. Nothing is appended (no quoted enquiry, no portal link, no timestamp),
   so what the client reads is what was written in the chat box.

   The frame and its email-client constraints live in email-layout.ts. */

import {
  emailDocument,
  greeting,
  greetingName,
  signOff,
  textParagraphs,
} from "./email-layout.ts";

export interface ReplyEmailInput {
  /** The client's display name, for the greeting. */
  clientName: string;
  /** What the admin typed in the chat box, verbatim. */
  body: string;
  /** What the enquiry was about. Used in the subject line only. */
  service: string | null;
  firmName: string;
}

export function replySubject(input: ReplyEmailInput): string {
  return `Re: ${input.service?.trim() || "your enquiry"}`;
}

/** Plain-text alternative. Not optional: it is what a text-only client shows,
    and its absence is a well-known spam signal. */
export function replyText(input: ReplyEmailInput): string {
  return [
    `Hi ${greetingName(input.clientName)},`,
    "",
    input.body,
    "",
    input.firmName,
  ].join("\n");
}

export function replyHtml(input: ReplyEmailInput): string {
  return emailDocument(input.firmName, [
    greeting(input.clientName),
    textParagraphs(input.body),
    signOff(input.firmName),
  ]);
}
