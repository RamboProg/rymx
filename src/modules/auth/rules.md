# auth module — Firestore rules

`users/{uid}`: the owning user may read their own profile document. All
writes happen server-side via the Admin SDK (session creation in
`src/modules/auth/server/session.ts`, and later Server Actions in Phase 5) and
are therefore denied at the rules layer entirely — the Admin SDK bypasses
rules, and the `role` field must never become client-writable.
