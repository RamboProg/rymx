# collections module — Firestore rules

`collections/{collectionId}`: publicly readable only when `active == true`
**and** the collection is live — either `publishAt` is unset or it has
already passed (`publishAt <= request.time`). Both conditions must hold;
`active` and `isCollectionVisible` (see `schema.ts`) are the source of truth
for read visibility, and the rule mirrors that composition exactly.

`active` is a manual staff on/off switch, layered on top of the `publishAt`
schedule — it lets staff pull a collection from the storefront immediately
(or hold one back indefinitely) independent of whatever `publishAt` says.
`publishAt` itself still needs no cron job or status flip: visibility from
the schedule alone is still computed dynamically from `publishAt` on every
read (both here and in `isCollectionLive`), unlike products (see
`catalog/schema.ts`'s `publishAt` comment and `/api/cron/publish`) — `active`
adds a second, independently-toggled gate on top of that, it doesn't change
how the schedule itself is evaluated.

Writes are denied at the rules layer; collection mutation happens
server-side via the Admin SDK, gated by the `collections:write` permission
check in `src/modules/collections/server/actions.ts`.
