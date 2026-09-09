import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { query } from "../../lib/db";
import { claimVerifiedGuestEnquiries } from "../../lib/enquiry-ownership";

/**
 * OAuth (Google) redirect target. Exchanges the PKCE `code` for a session,
 * then routes by role: admins to /admin, everyone else to /portal, unless an
 * explicit safe `next` was carried through.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  /* Every failure below lands on the same /login?notice=oauth screen, so the
     only way to tell them apart afterwards is this log. Grep "[auth] oauth".
     Never log `code` itself: it is a single-use credential. */
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error("[auth] oauth: provider returned an error", {
      error: providerError,
      // Google's own wording; untrusted text, logged but never rendered.
      description: searchParams.get("error_description"),
    });
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] oauth: could not exchange the code for a session", {
        message: error.message,
        status: error.status,
        code: error.code,
      });
    }
    if (!error) {
      if (data.user) {
        try {
          await claimVerifiedGuestEnquiries(data.user.id, data.user.email);
        } catch (claimError) {
          console.error(
            "[auth] could not claim verified guest enquiries:",
            claimError,
          );
        }
      }

      if (next) return NextResponse.redirect(`${origin}${next}`);

      // Role via the pg pool (bypasses RLS): reliable right after exchange.
      let role: string | null = null;
      const userId = data.user?.id;
      if (userId) {
        const { rows } = await query<{ role: string }>(
          "select role from public.profiles where id = $1",
          [userId],
        );
        role = rows[0]?.role ?? null;
      }
      return NextResponse.redirect(
        `${origin}${role === "admin" ? "/admin" : "/portal"}`,
      );
    }
  }

  /* Reached with no `code` and no provider error: usually a refresh or a
     back-navigation onto this URL after the code was already spent. */
  if (!code && !providerError) {
    console.error("[auth] oauth: callback hit with no code and no error", {
      referer: request.headers.get("referer"),
    });
  }

  return NextResponse.redirect(`${origin}/login?notice=oauth`);
}
