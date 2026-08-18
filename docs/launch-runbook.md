# RYMX launch runbook

One-time steps to take `rymx-prod` from "code is ready" to "real customers can order." Run through this top to bottom; each section notes what to verify before moving on.

## 1. Create the Firebase projects (if not done)

`rymx-dev` and `rymx-prod` are referenced in `.firebaserc` but may not exist yet as real Firebase projects.

- Create both in the [Firebase console](https://console.firebase.google.com) (or `firebase projects:create`).
- Enable Authentication (Email/Password + Google providers) and Firestore (production mode, region close to Vercel's function region) on each. Media is hosted on Cloudinary, not Firebase Storage — no Storage bucket needed.
- `firebase use prod` then `firebase deploy --only firestore:rules,firestore:indexes` to push `firestore.rules` and `firestore.indexes.json` to `rymx-prod`. Repeat with `firebase use dev` for `rymx-dev` (used by Preview deployments).
- Create a [Cloudinary](https://cloudinary.com) account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` (server-only) in each Vercel environment.

## 2. Google Sign-In authorized domains

Firebase Auth's Authorized Domains list doesn't support wildcards, and Vercel preview URLs are ephemeral — so:

- Add `rymx-prod`'s **production domain** to `rymx-prod`'s Authorized Domains.
- Pick one **stable** Vercel domain (a fixed alias, not a per-PR preview URL) and add it to `rymx-dev`'s Authorized Domains, for exercising Google sign-in against Preview deploys.
- Email/password auth works on any preview URL without this — only Google sign-in needs it.

## 3. Vercel project setup

- Link the repo, set the **function region** close to the Firestore region chosen above (cuts latency on every Admin SDK call).
- Confirm `engines.node` / `.nvmrc` pin the Node version Vercel builds with.
- Set environment variables **per Vercel environment** (Development / Preview / Production) — see `.env.example` for the full list and what each one does. In particular:
  - `NEXT_PUBLIC_FIREBASE_*` → `rymx-dev` values for Development/Preview, `rymx-prod` values for Production.
  - `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` → **unset** (or `false`) on every Vercel environment. Never `true` outside local dev.
  - `FIREBASE_SERVICE_ACCOUNT_BASE64` → base64-encoded service-account JSON for the matching project (`rymx-dev` for Dev/Preview, `rymx-prod` for Production). Generate with `[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))` (PowerShell) or `base64 -w0 service-account.json` (Linux/macOS).
  - `CRON_SECRET` → a random secret, matching what `vercel.json`'s cron hits (`/api/cron/publish`) checks.
  - `GMAIL_USER` / `GMAIL_APP_PASSWORD` → Gmail SMTP sender for order/status/promo emails, via a Gmail App Password (see `.env.example` for the setup steps). The app runs fine (logs a no-op instead of sending) if these are left unset, but real customers won't get order emails without them.
  - `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` → from the Sentry project, once created. Same no-op-if-unset behavior.
  - `NEXT_PUBLIC_SITE_URL` → the real production domain (no trailing slash), once known. Used by the sitemap, robots.txt, and Open Graph metadata.
- Run one throwaway PR and confirm the Vercel Preview build succeeds (Turbopack build, all env vars resolving) before doing anything else.

## 4. Seed the production catalog

`scripts/seed.ts` creates **demo** data (test products, demo accounts) — do **not** run it against `rymx-prod`. Instead:

- Create the real product catalog, categories, and store settings (`/admin/settings`) through the admin UI once the first owner account exists.
- Create the first owner account: register normally, then run `pnpm role:set <uid> owner` **against `rymx-prod`** (needs `FIREBASE_SERVICE_ACCOUNT_BASE64` for `rymx-prod` in your local `.env.local` temporarily, or run from a machine/CI job with prod credentials). This is the only way to bootstrap the first owner — every other role is grantable from `/admin/staff` once one owner exists.

## 5. Pre-launch smoke test (production)

Walk the full critical path against the real production deploy, not a preview:

1. Browse `/shop`, open a product, add to cart.
2. Complete a real COD checkout (use a real card... no — it's COD, use a real shipping address you control). Confirm the order confirmation page and email arrive.
3. Sign in as the owner, confirm the order appears in `/admin/orders`, fulfill it into a shipment with tracking, mark delivered.
4. Confirm `/admin/analytics` shows the order.
5. Check response headers in-browser (DevTools → Network → the `/` request) for `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` — confirm no CSP violations logged to the console anywhere in the flow above.
6. Confirm `/robots.txt` and `/sitemap.xml` resolve and list real product URLs.
7. If Sentry is wired up: trigger a deliberate error (e.g. visit a malformed admin URL) and confirm it shows up in the Sentry project within a minute or two.

## 6. Submit HSTS preload (optional, one-way door)

Once the production domain is stable and confirmed working over HTTPS with no mixed content: submit it at [hstspreload.org](https://hstspreload.org). This is essentially permanent (removal takes months to propagate through browsers) — only do this once you're confident the domain won't need to serve plain HTTP again.

## 7. Ongoing

- CI (`.github/workflows/ci.yml`) gates every PR on lint/typecheck/unit/rules/build/SAST/secrets/audit, and every PR's Vercel Preview on e2e + security headers + OWASP ZAP + Lighthouse budgets. Don't merge with any of those red.
- The Vercel Cron hitting `/api/cron/publish` flips scheduled products/collections live — confirm it's actually firing in the Vercel dashboard's Cron tab after the first deploy (Hobby-plan cron limits apply if not on a paid plan).
- Known limitation, not a blocker: the in-memory rate limiters (`src/lib/security/rateLimit.ts`) are per-serverless-instance, not shared across Vercel's multiple instances. Fine at launch traffic; revisit with a shared store (e.g. Upstash Redis) if abuse becomes a real concern.
