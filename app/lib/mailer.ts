/* SMTP transport for mail the firm sends OUT to clients. SERVER ONLY.

   Deliberately provider-agnostic: it speaks plain SMTP, so the same code sends
   through Zoho (where aibncharteredaccountants.ie mail lives), or Resend, or
   anything else, by changing env vars only. The layout of each email lives in
   this repo (see reply-email.ts), not in a provider's dashboard.

   Every send is best-effort. The caller has already committed its database row,
   so a refused send is logged and swallowed rather than thrown. */

import nodemailer, { type Transporter } from "nodemailer";

export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  replyTo: string;
}

/** Read SMTP settings from the environment. Returns null (and says which key is
    missing) when the deploy isn't configured, so sending degrades to a no-op
    instead of throwing on every reply. */
export function readMailerConfig(): MailerConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? 465);

  const missing = [
    !host && "SMTP_HOST",
    !user && "SMTP_USER",
    !pass && "SMTP_PASS",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.warn(`[mailer] SMTP not configured (missing ${missing.join(", ")})`);
    return null;
  }

  // MAIL_FROM defaults to the authenticated mailbox: most providers reject a
  // From that the account doesn't own, so this is the safe default.
  return {
    host: host!,
    port,
    user: user!,
    pass: pass!,
    from: process.env.MAIL_FROM || user!,
    replyTo: process.env.MAIL_REPLY_TO || process.env.MAIL_FROM || user!,
  };
}

// One transporter per process. Nodemailer pools connections, so rebuilding it
// per send would re-handshake TLS every time.
const globalForMail = globalThis as unknown as { mailer?: Transporter };

function getTransport(config: MailerConfig): Transporter {
  if (globalForMail.mailer) return globalForMail.mailer;
  const t = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  globalForMail.mailer = t;
  return t;
}

/**
 * Send one email. Returns true only when the SMTP server accepted it.
 * `text` is required: a plain-text alternative keeps the message readable in
 * clients that don't render HTML and materially helps spam scoring.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  logPrefix: string;
  /** Overrides MAIL_REPLY_TO. Used by the enquiry notification so the firm can
      reply straight to the customer. */
  replyTo?: string;
}): Promise<boolean> {
  const config = readMailerConfig();
  if (!config) {
    console.warn(`${opts.logPrefix} no SMTP config; skipping email`);
    return false;
  }

  try {
    await getTransport(config).sendMail({
      from: config.from,
      replyTo: opts.replyTo || config.replyTo,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error(`${opts.logPrefix} SMTP send failed:`, err);
    return false;
  }
}
