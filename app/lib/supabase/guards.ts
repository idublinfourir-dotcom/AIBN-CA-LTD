import { redirect } from "next/navigation";
import { createClient } from "./server";
import { query } from "../db";

/** Current authenticated user, or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type SessionUser = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "admin" | "client";
};

/**
 * User summary for UI (the header avatar/menu), all from the locally-verified
 * JWT (getClaims, no network round-trip). `role` comes from the `user_role`
 * claim stamped by the `custom_access_token_hook` (single source of truth =
 * profiles, set at token issuance). Falls back to a profiles lookup only when
 * the claim is absent (e.g. a token issued before the hook was enabled), so it
 * stays correct either way. Returns null when signed out.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = claims?.email;
  const id = claims?.sub;
  if (typeof email !== "string" || typeof id !== "string") return null;

  const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = meta[k];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };

  const claimRole = claims?.user_role;
  let role: "admin" | "client";
  if (claimRole === "admin" || claimRole === "client") {
    role = claimRole;
  } else {
    // Fallback until the JWT carries user_role (hook disabled / token not yet refreshed).
    const { rows } = await query<{ role: string }>(
      "select role from public.profiles where id = $1",
      [id],
    );
    role = rows[0]?.role === "admin" ? "admin" : "client";
  }

  return {
    email,
    name: pick("full_name", "name"),
    avatarUrl: pick("avatar_url", "picture"),
    role,
  };
}

/** Require any signed-in user; otherwise redirect to login. */
export async function requireUser(next = "/portal") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Require a non-admin (client) user. Admins are redirected to /admin so the two
 * areas stay segregated: an admin can't browse the client portal and vice
 * versa. Role is read via the pg pool (bypasses RLS) keyed on the user id.
 */
export async function requireClient() {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/portal")}`);

  const { rows } = await query<{ role: string }>(
    "select role from public.profiles where id = $1",
    [user.id],
  );

  if (rows[0]?.role === "admin") redirect("/admin");
  return user;
}

/**
 * Require an admin. Non-admins are sent to /portal (not 404) to avoid leaking
 * the existence of the admin area. Role is read via the pg pool (bypasses RLS)
 * keyed on the authenticated user id: reliable and not subject to the
 * is_admin() policy footgun.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/admin")}`);

  const { rows } = await query<{ role: string }>(
    "select role from public.profiles where id = $1",
    [user.id],
  );

  if (rows[0]?.role !== "admin") redirect("/portal");
  return user;
}
