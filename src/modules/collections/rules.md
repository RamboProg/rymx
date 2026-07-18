# collections module — Firestore rules

`collections/{collectionId}`: publicly readable only once live — either
`publishAt` is unset or it has already passed (`publishAt <= request.time`).
Scheduled drops stay invisible until the Vercel Cron job (Phase 6) flips them
live. Writes are denied at the rules layer; collection mutation happens
server-side via the Admin SDK.
