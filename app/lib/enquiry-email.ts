/* The acknowledgement sent to someone who submits the contact form: confirmation
   that their enquiry arrived and that a person will come back to them.

   It goes to the CUSTOMER. The firm hears about the same enquiry separately,
   through enquiryAlert in firm-alert-email.ts.

   The frame and its email-client constraints live in email-layout.ts. */

import { emailDocument, greeting, greetingName, paragraph, signOff } from "./email-layout.ts";

export interface EnquiryAckInput {
  /** The name they gave on the form, for the greeting. */
  name: string;
  firmName: string;
}

export function ackSubject(): string {
  return "We've received your enquiry";
}

/** The one line of substance, shared by both parts so they can't drift.
    It promises a reply within one working day: that is a commitment made to
    every enquirer, so change the service level here, not the copy. */
const ACK_LINE =
  "Thanks for getting in touch. We've received your enquiry and will reply within one working day.";

export function ackText(input: EnquiryAckInput): string {
  return [
    `Hi ${greetingName(input.name)},`,
    "",
    ACK_LINE,
    "",
    input.firmName,
  ].join("\n");
}

export function ackHtml(input: EnquiryAckInput): string {
  return emailDocument(input.firmName, [
    greeting(input.name),
    paragraph(ACK_LINE),
    signOff(input.firmName),
  ]);
}
