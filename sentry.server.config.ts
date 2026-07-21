import * as Sentry from "@sentry/nextjs";

// Sentry.init with an empty/undefined dsn is a documented no-op — safe to
// leave this unconditional. Set SENTRY_DSN in Vercel env vars to activate;
// nothing here needs to change when that happens.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
