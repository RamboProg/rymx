import * as Sentry from "@sentry/nextjs";

// Covers src/proxy.ts (Edge runtime). Same no-op-without-DSN behavior as
// sentry.server.config.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
