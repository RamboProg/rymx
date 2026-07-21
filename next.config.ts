import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Static OWASP baseline headers. Content-Security-Policy is NOT here — it
// needs a fresh nonce per request (for the strict script-src), so it's built
// and set in src/proxy.ts instead, alongside X-Nonce for the framework's own
// scripts to pick up. Everything below is genuinely static, so it belongs in
// next.config.ts headers() rather than duplicated per-request in proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // 2 years, includes subdomains, eligible for browser preload lists.
  // Submit to hstspreload.org once rymx-prod's domain is live.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      // Local Storage emulator only — unreachable in production, harmless to
      // leave in the allowlist.
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9199",
        pathname: "/v0/b/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// No-op without SENTRY_AUTH_TOKEN (source map upload requires it) — the
// wrapper itself is always safe to apply. disableLogger/automaticVercelMonitors
// are webpack-only options unsupported under this project's Turbopack build,
// left off rather than left silently ignored.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
