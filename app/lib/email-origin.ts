/* SERVER ONLY. The origin to put in an emailed link, for the request being
   handled. The precedence itself (SITE_URL, then the canonical host in
   production, then the request's Origin header in development) lives in
   site-origin.ts, which is pure and tested; this only feeds it. */

import { headers } from "next/headers";
import { site } from "./content";
import { resolveEmailOrigin } from "./site-origin";

export async function emailOrigin(): Promise<string> {
  const headerStore = await headers();
  return resolveEmailOrigin({
    configured: process.env.SITE_URL,
    canonical: site.url,
    isProduction: process.env.NODE_ENV === "production",
    originHeader: headerStore.get("origin"),
  });
}
