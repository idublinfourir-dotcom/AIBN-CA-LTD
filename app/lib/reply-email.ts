/* The admin-reply email, composed in this repo rather than in a provider's
   dashboard, so the layout is reviewable, diffable and changed in a commit.

   Deliberately minimal: a greeting, exactly what the admin typed, and the firm
   name. Nothing is appended (no quoted enquiry, no portal link, no timestamp),
   so what the client reads is what was written in the chat box.

   Email clients are a hostile rendering target: no <style> blocks (Gmail strips
   them), no flexbox or grid, tables for structure, inline styles only, and a
   600px fixed width. Keep it that way when editing. */

const INK = "#0b0b0c";

/** Escape text that goes anywhere near the HTML body. The reply is typed by an
    admin, but it is still untrusted input as far as this document is concerned:
    an unescaped "<" would break the layout at best. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Preserve the paragraph breaks the admin typed. */
function toParagraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">${escapeHtml(
          para,
        ).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

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

/** First name for the greeting, falling back to something that still reads as
    a sentence when the enquiry has no usable name on it. */
function greetingName(clientName: string): string {
  return clientName.trim().split(/\s+/)[0] || "there";
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
  const first = escapeHtml(greetingName(input.clientName));
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
              ${toParagraphs(input.body)}
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
