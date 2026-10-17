/* Where a `next` parameter may send someone after signing in.

   `next` arrives in a URL, so it is caller-controlled. A prefix check ("starts
   with / but not //") is not enough: a browser resolves "/\evil.example", and
   "/<tab>/evil.example" once the tab is stripped, to the external host
   evil.example. The login action's redirect is resolved by the browser, so that
   check let a crafted /login link bounce someone off-site straight after a real
   sign-in. The value is therefore parsed the way a browser parses it and only
   kept when it stays on this site.

   Pure (no Next imports) so it can be unit-tested. Every reader of `next` goes
   through this: the login action, /auth/callback and /auth/confirm. */

const PROBE_ORIGIN = "https://same-origin.invalid";

/** The same-site path `raw` points at, or null when it would leave the site. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/")) return null;

  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN) return null;

  /* Return the normalised form, not `raw`, so what was checked is what is
     sent. "/.//evil.example" normalises to "//evil.example", which is on-site
     here but protocol-relative wherever it is resolved next, so refuse it. */
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.startsWith("//") ? null : path;
}
