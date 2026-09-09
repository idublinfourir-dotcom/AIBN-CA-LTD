"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

/** "Continue with Google": starts the Supabase OAuth (PKCE) flow. */
export function GoogleButton() {
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    // Keep redirectTo free of query strings so it exact-matches the Supabase
    // redirect allow-list on every host (localhost + prod). A `?next=` param
    // fails the match on non-wildcard entries and Supabase falls back to the
    // Site URL (prod). The callback role-routes (/portal or /admin) anyway.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is redirected to Google; only reset on failure.
    if (error) setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-none border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-secondary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-default disabled:opacity-60"
    >
      <GoogleIcon />
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
