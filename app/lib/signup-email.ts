/* The signup confirmation link, composed and sent by THIS app rather than by
   Supabase.

   Supabase can mail this itself, but only through the project's custom SMTP
   panel and an email template edited in a dashboard, where the wording is not
   reviewable, not diffable, and a bad setting fails as an opaque 500 with the
   user rolled back. The firm already has working SMTP for its enquiry and
   reply mail, so signup uses that instead: see generateLink in
   app/signup/actions.ts, which produces the token WITHOUT Supabase sending
   anything.

   Same email-client constraints as reply-email.ts: tables for structure,
   inline styles only, no <style> blocks, 600px width. Pure — composes strings,
   sends nothing.

   Third copy of this shell now (enquiry-email.ts, reply-email.ts, here). If a
   fourth appears, extract it the way the Ireland Fintax repo did with
   email-layout.ts. */

const INK = "#0b0b0c";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function greetingName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
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
  const first = escapeHtml(greetingName(input.name));
  const firm = escapeHtml(input.firmName);
  // Not escaped as HTML text: this app builds it from its own origin and a
  // token hash, never from user input. Do not start passing arbitrary URLs in.
  const href = input.verifyUrl;

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
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">Confirm your email address to finish setting up your client account.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
                <tr>
                  <td style="background:${INK}">
                    <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Confirm my email</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6b6f6a">Or paste this into your browser:<br><a href="${href}" style="color:${INK}">${escapeHtml(href)}</a></p>
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">${EXPIRY_LINE} If you didn&#39;t ask for an account, ignore this email and nothing happens.</p>
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
