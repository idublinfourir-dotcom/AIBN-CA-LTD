"use server";

/* Forgot-password, as a typed numeric code rather than a clicked link.

   Same division of labour as signup: Supabase MINTS the credential, this app
   MAILS it. `generateLink({ type: "recovery" })` creates the recovery token and
   returns both a `hashed_token` (for a link) and `email_otp` (the raw code)
   without sending anything at all, so the message goes over the firm's own SMTP
   with a template that lives in this repo. See app/lib/reset-email.ts.

   The code, not the link, is deliberate:
   - it works on a different device from the one that asked, which the signup
     action_link cannot do (that comes back as a PKCE code bound to the browser
     that started the flow);
   - it keeps /auth/confirm narrowed to type=email, so this feature does not
     widen an existing verification route;
   - there is nothing clickable in the mail to impersonate.

   Two actions, not one, because the two steps are different operations with
   different abuse profiles: sending is an email-volume problem, verifying is a
   brute-force problem. They carry separate throttle keys. */

import { redirect } from "next/navigation";
import { createAdminClient } from "../lib/supabase/admin";
import { createClient } from "../lib/supabase/server";
import { allowPublicAction } from "../lib/rate-limit";
import { validatePassword } from "../lib/account-validation";
import { query } from "../lib/db";
import { site } from "../lib/content";
import { sendMail } from "../lib/mailer";
import { resetHtml, resetSubject, resetText } from "../lib/reset-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* How long is the code? Supabase decides, and it is a dashboard setting
   (Authentication -> Email OTP Length) that this repo cannot read. Measured
   against the live project on 2026-09-21 it comes back as EIGHT digits, not the
   six that most documentation shows. So nothing here hardcodes a length: the
   form accepts any plausible run of digits and lets Supabase be the authority
   on whether it is right. The only job of this check is to avoid spending a
   throttle attempt on obvious nonsense. Do not "tighten" it to a fixed number,
   and do not state a digit count in the UI or the email: both would be wrong
   the day that setting changes. */
const CODE_SHAPE = /^\d{6,10}$/;

export interface ResetRequestState {
  error?: string;
  /** True once we have accepted the request. Says nothing about the address. */
  sent?: boolean;
  email?: string;
}

export interface ResetConfirmState {
  error?: string;
  email?: string;
}

/* ─── Step 1: ask for a code ─────────────────────────────────────────────── */

export async function requestResetCode(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address.", email };
  }

  const allowed = await allowPublicAction({
    action: "password-reset-request",
    identity: email,
    ip: { max: 5, windowSeconds: 60 * 60 },
    identityLimit: { max: 3, windowSeconds: 60 * 60 },
  });
  if (!allowed) {
    /* Safe to be specific: a throttle message is returned for any address, so
       it reveals nothing about which ones have accounts. */
    return {
      error:
        "Too many reset requests. Please wait an hour, or contact us and we'll help.",
      email,
    };
  }

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  /* Every outcome below returns the SAME `sent: true`, whether the address has
     an account, has none, or the provider refused. A reset form that answers
     differently for a registered address is an account-enumeration oracle, and
     it is the one place that matters most, because the answer is "this person
     banks with these accountants".

     Note this protection is only partial in this codebase: signup deliberately
     reports "An account with this email already exists" (see AGENTS.md), so the
     fact already leaks there. That is a reason to fix signup one day, not a
     reason to leak it twice. */
  if (linkError || !link?.properties?.email_otp) {
    console.error("[reset] no code generated; answering as if sent:", {
      message: linkError?.message,
      status: linkError?.status,
      code: linkError?.code,
      hadOtp: Boolean(link?.properties?.email_otp),
    });
    return { sent: true, email };
  }

  const meta = (link.user?.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    typeof meta.full_name === "string" && meta.full_name.trim()
      ? meta.full_name
      : "";

  const mail = {
    name,
    // NEVER log this. It is a live credential for the next hour.
    code: link.properties.email_otp,
    firmName: site.name,
  };
  const sent = await sendMail({
    to: email,
    subject: resetSubject(),
    html: resetHtml(mail),
    text: resetText(mail),
    logPrefix: "[reset]",
  });

  /* Best-effort, unlike the signup send. There is no half-made account to roll
     back here, and surfacing a refused send would undo the anti-enumeration
     above: "we couldn't send it" confirms the address exists. So it logs loudly
     and shows the same screen. If users report codes never arriving, the
     evidence is this log line plus the Zoho sending limits, not the UI. */
  if (!sent) {
    console.error("[reset] SMTP refused the code send for a real account");
  }

  return { sent: true, email };
}

/* ─── Step 2: type the code, set the password ────────────────────────────── */

export async function resetPasswordWithCode(
  _prev: ResetConfirmState,
  formData: FormData,
): Promise<ResetConfirmState> {
  const email = String(formData.get("email") ?? "").trim();
  // Strip spaces and dashes: people paste "483 920" out of a mail client.
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EMAIL_RE.test(email)) {
    return { error: "Start again and enter your email address." };
  }
  if (!CODE_SHAPE.test(token)) {
    return { error: "Enter the code from the email, digits only.", email };
  }

  /* Validate the new password BEFORE spending the code. The code is single-use,
     so failing on a weak password after verifyOtp has consumed it would force a
     whole new request for a mistake the form can catch here. */
  const invalid = validatePassword(password, confirm);
  if (invalid) return { error: invalid, email };

  /* The brute-force boundary. Even at eight digits the code is only safe while
     attempts are capped: the per-identity limit is what makes guessing it
     infeasible inside its one-hour window, and it is the reason the length
     itself is not load-bearing. Supabase applies its own limits upstream, but
     those are not visible or configurable from here, so this does not rely on
     them. */
  const allowed = await allowPublicAction({
    action: "password-reset-verify",
    identity: email,
    ip: { max: 10, windowSeconds: 60 * 60 },
    identityLimit: { max: 5, windowSeconds: 60 * 60 },
  });
  if (!allowed) {
    return {
      error:
        "Too many attempts with that code. Please request a new one in an hour.",
      email,
    };
  }

  /* The SSR client, NOT the admin client: a successful verify must write the
     session cookie, which is the whole reason updateUser below is allowed to
     change the password. */
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (error || !data.user) {
    /* One message for wrong, expired and already-used. Telling them apart
       would say whether a code was ever issued for this address. */
    console.error("[reset] code rejected:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    return {
      error: "That code is not valid or has expired. Request a new one.",
      email,
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    /* The code was good, so they are signed in now; only the password write
       failed (a provider policy rejection, typically). Do not sign them out:
       the code is already spent, so that would strand them. Point them at
       Settings, where the same updateUser call lives. */
    console.error("[reset] password update failed after a good code:", {
      message: updateError.message,
      status: updateError.status,
      code: updateError.code,
    });
    return {
      error:
        "That code was accepted but the new password wasn't saved. You're signed in: set it under Settings, or try a different password.",
      email,
    };
  }

  /* A reset exists because the old password may be in someone else's hands, so
     every other session for this account goes. Best-effort: the password has
     already changed, which is the part that matters, so a failure here is logged
     rather than surfaced. */
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "others",
  });
  if (signOutError) {
    console.error("[reset] could not revoke other sessions:", signOutError);
  }

  // Role via the pg pool (bypasses RLS): reliable right after the session is
  // established, same as the login action and the OAuth callback.
  let role: string | null = null;
  const { rows } = await query<{ role: string }>(
    "select role from public.profiles where id = $1",
    [data.user.id],
  );
  role = rows[0]?.role ?? null;

  redirect(role === "admin" ? "/admin" : "/portal");
}
