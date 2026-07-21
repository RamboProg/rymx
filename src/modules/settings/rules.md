# settings module — Firestore rules

`settings/shipping`, `settings/store`, `settings/policies`: publicly
readable (shipping rates, COD/tax config, and policy copy are not
sensitive, and the storefront — cart shipping estimate, checkout total,
`/policies/*` pages — reads them directly), never client-writable. All
writes go through `src/modules/settings/server/actions.ts`, gated by the
`settings:manage` permission.

`settings/emailTemplates`: internal-only, never client-readable (no
storefront surface reads it — only the notifications module, server-side).
