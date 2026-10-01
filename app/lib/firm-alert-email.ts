/* Alerts to the FIRM, as opposed to every other template here, which writes to
   a client. Three things happen on the site that someone at the firm has to
   act on, and each one now lands in the firm's own mailbox (see notifyFirm in
   mailer.ts) instead of waiting unseen until somebody opens /admin:

   - a new enquiry from the contact form          enquiryAlert
   - a client writing in their portal thread      clientMessageAlert
   - a Founders Hub "request a copy"              toolkitRequestAlert

   An alert is a pointer, not a channel. Reply-To stays the firm's own address
   and the alert says to answer from the admin portal: a reply sent from a mail
   client never appears in the enquiry thread, which is the reason the old
   "Reply by email" button was removed. Chosen over a Reply-To of the client's
   address, asked and confirmed 2026-10-01.

   Every value shown was typed by a visitor, so the HTML escapes all of it and
   the subject flattens it to one capped line. Pure: composes strings, sends
   nothing. */

import {
  button,
  emailDocument,
  escapeHtml,
  finePrint,
  INK,
  MUTED,
  paragraph,
  RULE,
  textParagraphs,
  WASH,
} from "./email-layout.ts";

export interface FirmAlert {
  subject: string;
  text: string;
  html: string;
}

/** One line, capped. A subject is a header, and a name typed into a form has
    no business deciding its length or adding a line break to it. */
export function oneLine(value: string, max = 80): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Said in every enquiry and chat alert, in both parts. */
const REPLY_IN_PORTAL =
  "Reply from the admin portal rather than from this email. The client gets your reply by email and it stays in the enquiry thread.";

/** Why a follow-up may arrive without its own alert: see the unread check in
    app/portal/actions.ts. Saying so here means a quiet inbox is never read as
    "they haven't written back". */
const ONE_ALERT_UNTIL_OPENED =
  "Until you open the conversation, further messages in it won't send another alert.";

type Field = [label: string, value: string | null | undefined];

interface AlertParts {
  subject: string;
  headline: string;
  fields: Field[];
  messageLabel: string;
  message: string;
  /** Absolute URL into /admin. Built here from the app's own origin. */
  actionUrl: string;
  actionLabel: string;
  notes: string[];
  firmName: string;
}

function compose(parts: AlertParts): FirmAlert {
  const fields = parts.fields
    .map(([label, value]) => [label, oneLine(value ?? "", 500)] as const)
    .filter(([, value]) => value !== "");

  const text = [
    parts.headline,
    "",
    ...fields.map(([label, value]) => `${label}: ${value}`),
    "",
    `${parts.messageLabel}:`,
    parts.message,
    "",
    `${parts.actionLabel}: ${parts.actionUrl}`,
    "",
    ...parts.notes,
  ].join("\n");

  const rows = fields
    .map(
      ([label, value]) => `  <tr>
    <td style="padding:0 16px 6px 0;font-size:14px;line-height:22px;color:${MUTED};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
    <td style="padding:0 0 6px;font-size:14px;line-height:22px;color:${INK};vertical-align:top">${escapeHtml(value)}</td>
  </tr>`,
    )
    .join("\n");

  const html = emailDocument(parts.firmName, [
    paragraph(`<strong>${escapeHtml(parts.headline)}</strong>`),
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
${rows}
</table>`,
    `<p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${MUTED}">${escapeHtml(parts.messageLabel)}</p>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
  <tr>
    <td style="background:${WASH};border:1px solid ${RULE};padding:16px 16px 0">${textParagraphs(parts.message)}</td>
  </tr>
</table>`,
    button(escapeHtml(parts.actionUrl), parts.actionLabel),
    ...parts.notes.map((note) => finePrint(escapeHtml(note))),
  ]);

  return { subject: parts.subject, text, html };
}

/** "Label from Name" plus ": detail" when there is one. */
function subjectLine(label: string, name: string, detail?: string | null): string {
  const who = oneLine(name) || "someone";
  const what = detail ? oneLine(detail) : "";
  return what ? `${label} from ${who}: ${what}` : `${label} from ${who}`;
}

function enquiryUrl(origin: string, enquiryId: string): string {
  return `${origin}/admin/enquiries?id=${encodeURIComponent(enquiryId)}`;
}

export interface EnquiryAlertInput {
  enquiryId: string;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  message: string;
  /** The app's own origin, from resolveEmailOrigin. */
  origin: string;
  firmName: string;
}

export function enquiryAlert(input: EnquiryAlertInput): FirmAlert {
  return compose({
    subject: subjectLine("New enquiry", input.name, input.service),
    headline: subjectLine("New enquiry", input.name),
    fields: [
      ["Name", input.name],
      ["Email", input.email],
      ["Company", input.company],
      ["Service", input.service],
    ],
    messageLabel: "Their message",
    message: input.message,
    actionUrl: enquiryUrl(input.origin, input.enquiryId),
    actionLabel: "Open the enquiry",
    notes: [REPLY_IN_PORTAL, ONE_ALERT_UNTIL_OPENED],
    firmName: input.firmName,
  });
}

export interface ClientMessageAlertInput {
  enquiryId: string;
  /** The name on the enquiry. */
  clientName: string;
  /** The address the client signs in with. */
  clientEmail: string;
  service: string | null;
  message: string;
  origin: string;
  firmName: string;
}

export function clientMessageAlert(input: ClientMessageAlertInput): FirmAlert {
  return compose({
    subject: subjectLine("New message", input.clientName, input.service),
    headline: subjectLine("New message", input.clientName),
    fields: [
      ["Name", input.clientName],
      ["Email", input.clientEmail],
      ["Enquiry", input.service?.trim() || "General enquiry"],
    ],
    messageLabel: "Their message",
    message: input.message,
    actionUrl: enquiryUrl(input.origin, input.enquiryId),
    actionLabel: "Open the conversation",
    notes: [REPLY_IN_PORTAL, ONE_ALERT_UNTIL_OPENED],
    firmName: input.firmName,
  });
}

export interface ToolkitRequestAlertInput {
  resourceTitle: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  purpose: string;
  origin: string;
  firmName: string;
}

export function toolkitRequestAlert(input: ToolkitRequestAlertInput): FirmAlert {
  return compose({
    subject: subjectLine("Founders Hub request", input.name, input.resourceTitle),
    headline: subjectLine("Founders Hub request", input.name),
    fields: [
      ["Resource", input.resourceTitle],
      ["Name", input.name],
      ["Email", input.email],
      ["Phone", input.phone],
      ["Website", input.website],
    ],
    messageLabel: "What they need it for",
    message: input.purpose,
    actionUrl: `${input.origin}/admin/toolkits`,
    actionLabel: "Open Founders Hub requests",
    notes: [
      "Send the document from your own mailbox, then press Mark sent in the admin portal so the request leaves the to-send list.",
    ],
    firmName: input.firmName,
  });
}
