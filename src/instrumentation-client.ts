import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_ prefix required — this file ships to the browser bundle.
// No-op without a DSN, same pattern as the server config.
//
// Session Replay is capped at 10% of normal sessions but 100% of sessions
// that hit an error — the error case is what actually matters for
// debugging, the 10% baseline is just to spot-check UX issues that don't
// throw. Revisit both numbers once real traffic volume is known (100%
// tracesSampleRate is fine at launch scale, gets expensive fast at real
// scale).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
