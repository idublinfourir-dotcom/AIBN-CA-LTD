"use server";

import { headers } from "next/headers";
import { createClient } from "../lib/supabase/server";
import { createAdminClient } from "../lib/supabase/admin";
import { allowPublicAction } from "../lib/rate-limit";
import { resolveEmailOrigin } from "../lib/site-origin";
import { site } from "../lib/content";

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
  const supabase = await createClient();
  const { data: created, error: createError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      ...(origin ? { emailRedirectTo: `${origin}/auth/confirm` } : {}),
    },
  });

  if (createError) {
    /* Never render a provider error verbatim. Its wording is not written for
       the person in front of us, it can leak internals, and when the API
       answers with a body this client cannot parse the message ends up being
       the literal string "{}" on the signup screen. Seen in production.

       The full error is logged instead, so the cause is still recoverable from
       the server output. */
    console.error("[signup] Supabase refused the signup:", {
      message: createError.message,
      status: createError.status,
      code: createError.code,
    });

    const text = String(createError.message ?? "");
    if (/already|exists|registered|duplicate/i.test(text)) {
      return {
        error: "An account with this email already exists. Try signing in.",
        values,
      };
    }

    /* The confirmation mail could not be sent, so no account was created:
       GoTrue rolls the user back. Almost always the project's SMTP settings,
       which is an operator problem rather than anything this person can fix,
       so say so plainly instead of blaming their details. */
    if (/confirmation email|sending.*email/i.test(text) || createError.status === 500) {
      return {
        error:
          "We couldn't send the confirmation email, so your account wasn't created. This is our end, not yours. Please try again shortly, or contact us and we'll set it up.",
        values,
      };
    }

    return {
      error: "Account creation is temporarily unavailable. Please try again.",
      values,
    };
  }

  /* An address that is already registered does NOT come back as an error.
     Supabase deliberately returns a success with an obfuscated user and an
     EMPTY identities array, and sends no email, so that signup cannot be used
     to enumerate accounts. Without this check the screen says "check your
     email" for a message that was never sent, which is indistinguishable from
     a broken mailer and sent one real debugging session chasing SMTP.

     Saying "this address is taken" does give up the same information the
     obfuscation protects, which is a deliberate trade: the sign-in form
     already reveals it, and a confirmation screen that lies is worse. */
  if (created.user && created.user.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Try signing in.",
      values,
    };
  }

  // Email confirmation is a security boundary: guest enquiries may only be
  // claimed after this address has been proved. Fail closed if the Supabase
  // project is accidentally configured to issue a session immediately.
  if (created.session) {
    await supabase.auth.signOut();
    if (created.user?.id) {
      const { error: deleteError } = await createAdminClient()
        .auth.admin.deleteUser(created.user.id);
      if (deleteError) {
        console.error(
          "[signup] could not remove insecurely auto-confirmed user:",
          deleteError,
        );
      }
    }
    console.error(
      "[signup] blocked because Supabase email confirmation is disabled",
    );
    return {
      error:
        "Account creation is temporarily unavailable. Please contact the team.",
      values,
    };
  }

  return { checkEmail: true, values };
}
