"use server";

import { headers } from "next/headers";
import { createAdminClient } from "../lib/supabase/admin";
import { allowPublicAction } from "../lib/rate-limit";
import { resolveEmailOrigin } from "../lib/site-origin";
import { site } from "../lib/content";
import { sendMail } from "../lib/mailer";
import {
  confirmHtml,
  confirmSubject,
  confirmText,
} from "../lib/signup-email";

export interface SignupState {
  error?: string;
  checkEmail?: boolean;
  values?: { email?: string; fullName?: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { email, fullName };

  if (fullName.length < 2) return { error: "Please tell us your name.", values };
  if (!EMAIL_RE.test(email))
    return { error: "Please enter a valid email address.", values };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters.", values };

  const allowed = await allowPublicAction({
    action: "signup",
    identity: email,
    ip: { max: 5, windowSeconds: 60 * 60 },
    identityLimit: { max: 3, windowSeconds: 60 * 60 },
  });
  if (!allowed) {
    return {
      error:
        "Too many account creation attempts. Please wait an hour and try again.",
      values,
    };
  }

  /* Where the confirmation link comes back to. In production this is the
     committed canonical host, never the request's Origin header: see
     resolveEmailOrigin. Whatever it resolves to must also be listed in
     Supabase's redirect allow-list, or Supabase silently substitutes the
     project's Site URL. */
  const headerStore = await headers();
  const origin = resolveEmailOrigin({
    configured: process.env.SITE_URL,
    canonical: site.url,
    isProduction: process.env.NODE_ENV === "production",
    originHeader: headerStore.get("origin"),
  });
  /* Generate the confirmation link WITHOUT Supabase sending anything, then
     mail it ourselves over the firm's own SMTP.

     signUp() would have Supabase send it, which means the message lives in a
     dashboard template and delivery depends on the project's custom SMTP
     panel. That failed opaquely in production: a bad setting there answers
     with a 500 "Error sending confirmation email" and GoTrue rolls the user
     back, so signup breaks entirely and the cause is invisible outside the
     dashboard logs. The same mailbox that sends enquiry acknowledgements and
     admin replies is already proven, so this uses it.

     generateLink still creates the account, unconfirmed, and returns the token
     hash. Nothing is emailed by Supabase. */
  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (linkError) {
    /* Never render a provider error verbatim. Its wording is not written for
       the person in front of us, it can leak internals, and when the API
       answers with a body this client cannot parse the message ends up being
       the literal string "{}" on the signup screen. Seen in production. */
    console.error("[signup] could not generate the confirmation link:", {
      message: linkError.message,
      status: linkError.status,
      code: linkError.code,
    });

    // An address that already has an account is reported here as an error,
    // rather than as the obfuscated empty-identities success signUp returns.
    if (/already|exists|registered|duplicate/i.test(String(linkError.message ?? ""))) {
      return {
        error: "An account with this email already exists. Try signing in.",
        values,
      };
    }
    return {
      error: "Account creation is temporarily unavailable. Please try again.",
      values,
    };
  }

  const tokenHash = link?.properties?.hashed_token;
  const userId = link?.user?.id;

  if (!tokenHash) {
    console.error("[signup] generateLink returned no token hash");
    return {
      error: "Account creation is temporarily unavailable. Please try again.",
      values,
    };
  }

  /* Email confirmation is a security boundary: guest enquiries may only be
     claimed after this address has been proved. If the project is configured
     with confirmation disabled the account comes back already confirmed, which
     would let anyone claim another person's enquiries by typing their address.
     Fail closed and remove it. */
  if (link?.user?.email_confirmed_at) {
    if (userId) await admin.auth.admin.deleteUser(userId);
    console.error(
      "[signup] blocked because Supabase email confirmation is disabled",
    );
    return {
      error:
        "Account creation is temporarily unavailable. Please contact the team.",
      values,
    };
  }

  /* type=email is what /auth/confirm passes to verifyOtp. Building the URL
     here rather than using link.properties.action_link is deliberate: the
     action_link routes through Supabase's own /verify endpoint and comes back
     carrying a PKCE `code`, which that route does not read, and which cannot
     be exchanged on a different device from the one that signed up. */
  const verifyUrl = `${origin}/auth/confirm?token_hash=${encodeURIComponent(
    tokenHash,
  )}&type=email`;

  const mail = {
    name: fullName,
    verifyUrl,
    firmName: site.name,
  };
  const sent = await sendMail({
    to: email,
    subject: confirmSubject(),
    html: confirmHtml(mail),
    text: confirmText(mail),
    logPrefix: "[signup]",
  });

  /* The link IS the second half of this transaction: an account that cannot be
     confirmed can never be signed in to. So a failed send is the one mail
     failure in this codebase that is not best-effort. Remove the account and
     say so, rather than leaving a dead one behind and blaming their inbox. */
  if (!sent) {
    if (userId) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error(
          "[signup] could not remove the account after a failed send:",
          deleteError,
        );
      }
    }
    return {
      error:
        "We couldn't send the confirmation email, so your account wasn't created. This is our end, not yours. Please try again shortly, or contact us and we'll set it up.",
      values,
    };
  }

  return { checkEmail: true, values };
}
