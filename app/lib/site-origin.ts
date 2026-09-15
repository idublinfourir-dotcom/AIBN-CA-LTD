/* Where an emailed link should point.

   Pure and free of `next/headers`, so it can be unit-tested and so the
   precedence is stated once rather than re-derived at each call site.

   In production the canonical host is a committed constant (`site.url`), so a
   link this app puts in someone's inbox never needs to consult a request
   header. That was the original shape and it is the wrong one: a link built
   from the Origin header is only valid for the host that happened to send the
   request. Sign up against a dev server and the recipient gets
   http://localhost:3000, which resolves to the reader's own machine and which
   most mail clients will not even turn into a link.

   The header stays as the DEVELOPMENT fallback, because locally the canonical
   host is precisely what you do not want. SITE_URL overrides everything, for a
   staging host that is neither. */

export function resolveEmailOrigin(input: {
  /** SITE_URL: an explicit override, e.g. a staging host. Usually unset. */
  configured?: string | null;
  /** The committed canonical host. Used whenever this is a production build. */
  canonical: string;
  /** True in a production build. */
  isProduction: boolean;
  /** The request's Origin header, used in development. */
  originHeader?: string | null;
}): string {
  const trim = (value: string | null | undefined) =>
    value?.trim().replace(/\/+$/, "") || "";

  const configured = trim(input.configured);
  if (configured) return configured;
  if (input.isProduction) return trim(input.canonical);

  return trim(input.originHeader) || trim(input.canonical);
}
