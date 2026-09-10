/* The acknowledgement sent to someone who submits the contact form: confirmation
   that their enquiry arrived and that a person will come back to them.

   It goes to the CUSTOMER, not to the firm. New enquiries surface in
   /admin/enquiries with an unread badge, which is how the firm sees them.

   Same email-client constraints as reply-email.ts: tables for structure, inline
   styles only, no <style> blocks, 600px width. */

const INK = "#0b0b0c";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EnquiryAckInput {
  /** The name they gave on the form, for the greeting. */
  name: string;
  firmName: string;
}

export function ackSubject(): string {
  return "We've received your enquiry";
}

function greetingName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
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
  const first = escapeHtml(greetingName(input.name));
  const firm = escapeHtml(input.firmName);

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f5f3">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f3;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e3e5e0">

          <tr>
            <td style="background:${INK};padding:20px 28px">
              <span style="color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:17px;letter-spacing:0.02em">${firm}</span>
            </td>
          </tr>

          <tr>
            <td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">Hi ${first},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">${ACK_LINE}</p>
              <p style="margin:24px 0 0;font-size:15px;line-height:24px;color:${INK}">${firm}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
