# account module — Firestore rules

`users/{uid}` already denies all direct client writes (see
`src/modules/auth/rules.md`) — profile edits (`displayName`, `phone`) go
through `updateProfileAction` via the Admin SDK, same as everything else on
that document.

`users/{uid}/addresses/{addressId}`: the owning user may read their own
saved addresses. All writes are denied at the rules layer; adding/removing
an address happens server-side via `addAddressAction`/`removeAddressAction`
in `src/modules/account/server/actions.ts`.
