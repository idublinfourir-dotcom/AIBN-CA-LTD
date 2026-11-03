/* The pure half of the admin's email warning. No IO: mailer.ts records a
   failure through mail-failures.ts, and the admin layout reads it back through
   the same module, but every decision about what a failure is called, what it
   stores and what it tells the admin is made here, where it can be tested.

   Why the warning exists: from launch until 3 Nov 2026 the live site had no
   SMTP settings at all. Every enquiry still saved, so /admin looked healthy,
   while no alert, acknowledgement, reply, signup link or reset code was sent.
   The only trace was a log line, and Vercel's Hobby plan keeps logs for an
   hour. A failed send now leaves a row the admin sees on every /admin page. */

/** Every kind of email the site sends. Each sendMail call names one. */
export type MailKind =
  | "enquiry-ack"
  | "firm-alert"
  | "client-reply"
  | "signup-confirm"
  | "password-reset";

/** What the admin reads for each kind: who missed out, in plain words. */
export const MAIL_KIND_LABELS: Record<MailKind, string> = {
  "enquiry-ack": "Thank-you email to a new enquirer",
  "firm-alert": "Alert to the firm's inbox",
  "client-reply": "Your reply, emailed to the client",
  "signup-confirm": "Signup confirmation (the account was not created)",
  "password-reset": "Password reset code",
};

export function mailKindLabel(kind: string): string {
  return MAIL_KIND_LABELS[kind as MailKind] ?? "Email";
}

/** Sending is off unless all three are set (MAIL_FROM and the rest default). */
export const REQUIRED_MAIL_KEYS = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const;

type Env = Record<string, string | undefined>;

/** The required keys this deployment lacks, in a fixed order. Empty means
    sending is configured (which is not the same as working). */
export function missingMailKeys(env: Env): string[] {
  return REQUIRED_MAIL_KEYS.filter((key) => !env[key]?.trim());
}

/** Which deployment a failure happened on. Dev, preview and production share
    one database, so each only shows its own: a preview build has no SMTP on
    purpose, and its skipped sends must not alarm the live admin. */
export function mailEnvironment(env: Env): string {
  return env.VERCEL_ENV?.trim() || "local";
}

export type MailFailureReason = "not_configured" | "refused";

const DETAIL_MAX = 300;
const ADDRESS = /[^\s<>()"',;:@]+@[^\s<>()"',;:@]+/g;

/**
 * One short line for a refused send, safe to store and show: the transport's
 * error code and the server's reply, with every email address replaced. A
 * server's refusal often quotes the recipient ("550 <x@y>: mailbox
 * unavailable"), and the failure log keeps no addresses.
 */
export function describeSmtpError(err: unknown): string {
  let code = "";
  let text = "";
  if (err && typeof err === "object") {
    const e = err as { code?: unknown; response?: unknown; message?: unknown };
    if (typeof e.code === "string") code = e.code;
    if (typeof e.response === "string" && e.response.trim()) text = e.response;
    else if (typeof e.message === "string") text = e.message;
  } else if (err !== undefined && err !== null) {
    text = String(err);
  }

  const flat = text.replace(/\s+/g, " ").trim();
  const line = code && flat ? `${code}: ${flat}` : code || flat || "Unknown error";
  const safe = line.replace(ADDRESS, "[address]");
  return safe.length > DETAIL_MAX ? `${safe.slice(0, DETAIL_MAX - 1).trimEnd()}…` : safe;
}

/** What went wrong, in words the admin can act on. `detail` is the stored
    describeSmtpError line; its leading code picks the sentence. */
export function explainMailFailure(
  reason: string,
  detail: string | null | undefined,
): string {
  if (reason === "not_configured") return "The mail settings were missing, so nothing was sent.";
  const code = detail?.match(/^([A-Z]+):/)?.[1] ?? "";
  if (code === "EAUTH")
    return "The mail server refused the login. The mailbox password may have been changed or revoked.";
  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNREFUSED", "ECONNRESET"].includes(code))
    return "The mail server could not be reached.";
  if (code === "EENVELOPE") return "The mail server refused the recipient's address.";
  return "The mail server refused the message.";
}

/** Only a path inside /admin is ever linked, whatever the row says. */
export function safeAdminHref(href: string | null | undefined): string | null {
  if (!href) return null;
  return /^\/admin(?:[/?#]|$)/.test(href) ? href : null;
}
