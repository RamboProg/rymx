import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_ prefix required — this file ships to the browser bundle.
// No-op without a DSN, same pattern as the server config.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
