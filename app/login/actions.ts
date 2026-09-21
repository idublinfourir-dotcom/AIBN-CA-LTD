"use server";

import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import { query } from "../lib/db";
import { loginErrorMessage } from "../lib/login-errors";

export interface AuthState {
  error?: string;
  values?: { email?: string };
}

/** Only same-origin relative paths: blocks open-redirects via `next`. */
function isSafe(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedNext = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "Enter your email and password.", values: { email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    /* Log the provider's own words; show the person ours. See
       app/lib/login-errors.ts for why this is keyed on `code`, and why an
       unconfirmed account keeps a message of its own. */
    console.error("[login] sign-in refused:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { error: loginErrorMessage(error.code), values: { email } };
  }

  // Honor an explicit, safe redirect (set when the user was gated). Otherwise
  // route by role: admins land on /admin, everyone else on /portal.
  if (requestedNext && isSafe(requestedNext)) {
    redirect(requestedNext);
  }

  // Look up role via the pg pool (bypasses RLS): reliable and independent of
  // the just-set session cookie that the RLS read path depends on.
  let role: string | null = null;
  const userId = data.user?.id;
  if (userId) {
    const { rows } = await query<{ role: string }>(
      "select role from public.profiles where id = $1",
      [userId],
    );
    role = rows[0]?.role ?? null;
  }

  redirect(role === "admin" ? "/admin" : "/portal");
}
