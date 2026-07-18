# collections module — Firestore rules

`collections/{collectionId}`: publicly readable only once live — either
`publishAt` is unset or it has already passed (`publishAt <= request.time`).
Visibility is computed dynamically from `publishAt` on every read (both here
and in `isCollectionLive`), so scheduled drops need no cron job or status
flip — unlike products (see `catalog/schema.ts`'s `publishAt` comment and
`/api/cron/publish`), there's no separate "live" flag to keep in sync.
Writes are denied at the rules layer; collection mutation happens
server-side via the Admin SDK, gated by the `collections:write` permission
check in `src/modules/collections/server/actions.ts`.
