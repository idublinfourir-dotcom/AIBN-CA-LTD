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

   Same email-client constraints as the others: tables for structure, inline
   styles only, no <style> blocks, 600px width. Pure, composes strings and
   sends nothing.

   Fourth copy of this shell now (enquiry-email.ts, reply-email.ts,
   signup-email.ts, here). signup-email.ts asks for the shell to be extracted
   into email-layout.ts once a fourth appeared: that is now due, and is left as
   its own change so this feature stays reviewable. */

const INK = "#0b0b0c";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function greetingName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
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
  const first = escapeHtml(greetingName(input.name));
  const firm = escapeHtml(input.firmName);
  const code = escapeHtml(input.code);

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
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">Here is the code to reset your password. Type it into the form you started on our site, along with your new password.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
                <tr>
                  <td style="background:#f4f5f3;border:1px solid #e3e5e0;padding:16px 24px">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:0.18em;color:${INK}">${code}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK}">${EXPIRY_LINE} ${PHISHING_LINE}</p>
              <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6b6f6a">${IGNORE_LINE}</p>
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
