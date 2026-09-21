import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { claimVerifiedGuestEnquiries } from "../../lib/enquiry-ownership";

/* The only OTP type this app ever issues: app/signup/actions.ts builds every
   link with type=email. The value arrives in a URL and is therefore
   caller-controlled, so it is allow-listed rather than cast, and a crafted link
   cannot hand verifyOtp a different flow. Add an entry deliberately if a
   password-recovery or email-change flow is introduced. */
const ALLOWED_OTP_TYPES: readonly EmailOtpType[] = ["email"];

function parseOtpType(raw: string | null): EmailOtpType | null {
  return ALLOWED_OTP_TYPES.find((allowed) => allowed === raw) ?? null;
}

/**
 * Email-confirmation landing route. The signup mail links here with a
 * `token_hash`; we verify it, which sets the session cookie, then forward the
 * user on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));
  const next = searchParams.get("next") ?? "/portal";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/portal";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await claimVerifiedGuestEnquiries(user.id, user.email);
        } catch (claimError) {
          console.error(
            "[auth] could not claim verified guest enquiries:",
            claimError,
          );
        }
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?notice=confirm`);
}
