/* The frame every email this site sends is drawn in: the dark firm-name bar,
   one white 600px card, and the handful of blocks the templates share.

   It was copied into four templates (enquiry-email.ts, reply-email.ts,
   signup-email.ts, reset-email.ts) before a fifth, firm-alert-email.ts, made
   extracting it overdue. Each template now supplies only what it says.

   Email clients are a hostile rendering target: no <style> blocks (Gmail strips
   them), no flexbox or grid, tables for structure, inline styles only, and a
   600px fixed width. Keep it that way when editing. Pure: composes strings,
   sends nothing. */

export const INK = "#0b0b0c";
/** Secondary text: fine print and field labels. */
export const MUTED = "#6b6f6a";
/** The page background, reused for inset boxes inside the card. */
export const WASH = "#f4f5f3";
export const RULE = "#e3e5e0";

/** Escape text that goes anywhere near an HTML body. Everything a person typed
    is untrusted as far as the document is concerned: an unescaped "<" would
    break the layout at best. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** First name for the greeting, falling back to something that still reads as
    a sentence when there is no usable name. */
export function greetingName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

/** One body paragraph. `html` goes in as-is, so escape anything untrusted
    before passing it. */
export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">${html}</p>`;
}

/** Smaller, muted paragraph for the lines a reader may skip. `html` as-is. */
export function finePrint(html: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${MUTED}">${html}</p>`;
}

/** Plain text as paragraphs, keeping the breaks its writer typed. Escapes. */
export function textParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => paragraph(escapeHtml(para).replace(/\n/g, "<br>")))
    .join("");
}

export function greeting(name: string): string {
  return paragraph(`Hi ${escapeHtml(greetingName(name))},`);
}

export function signOff(firmName: string): string {
  return `<p style="margin:24px 0 0;font-size:15px;line-height:24px;color:${INK}">${escapeHtml(firmName)}</p>`;
}

/** A dark call-to-action button. `href` is NOT escaped: pass only a URL this
    app built from its own origin, never anything a visitor supplied. */
export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
  <tr>
    <td style="background:${INK}">
      <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/** The whole document: the firm-name bar, then `blocks` in order inside the
    card. Blocks are HTML strings from the helpers above (or a template's own
    table); each is indented into place so the source stays readable. */
export function emailDocument(firmName: string, blocks: string[]): string {
  const firm = escapeHtml(firmName);
  const content = blocks
    .join("\n")
    .split("\n")
    .map((line) => (line ? `              ${line}` : line))
    .join("\n");

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${WASH}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WASH};padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${RULE}">

          <tr>
            <td style="background:${INK};padding:20px 28px">
              <span style="color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:17px;letter-spacing:0.02em">${firm}</span>
            </td>
          </tr>

          <tr>
            <td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
${content}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
