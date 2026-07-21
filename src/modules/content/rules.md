# content module — Firestore rules

`content/homepage`: the announcement bar and hero copy — publicly readable
(rendered on every page via `Header` and on `/`), never client-writable.
Writes go through `src/modules/content/server/actions.ts`, gated by the
`settings:manage` permission (no dedicated `content:manage` permission
exists — see the comment in that file for why).
