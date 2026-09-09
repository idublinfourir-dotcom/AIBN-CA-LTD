import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabaseHttps = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWss = supabaseHttps.replace(/^https:/, "wss:");

// Content-Security-Policy. Scripts/styles use 'unsafe-inline' because the app
// doesn't (yet) wire per-request nonces through Next's RSC bootstrap; the policy
// still blocks framing, foreign script/connect origins, and plugins. 'unsafe-eval'
// and localhost websockets are dev-only (Turbopack HMR).
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://lh3.googleusercontent.com https://images.unsplash.com`,
  `font-src 'self'`,
  `connect-src 'self' ${supabaseHttps} ${supabaseWss}${isDev ? " ws: http://localhost:*" : ""}`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
]
  .join("; ")
  .replace(/\s+/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async redirects() {
    return [
      // The mortgage calculator moved from the Accountants Hub to the Personal
      // Hub. Permanent so the indexed URL passes its ranking to the new one;
      // the page had been live and linked from the portal, so it cannot 404.
      {
        source: "/tools/ireland",
        destination: "/personal/mortgage",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
