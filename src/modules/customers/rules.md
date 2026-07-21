# customers module — Firestore rules

`users/{uid}/notes/{noteId}`: internal staff notes about a customer, never
client-readable — not even by the customer themselves, same reasoning as
`orders/{orderId}/notes`. Written by `addCustomerNoteAction`, gated by the
`customers:manage` permission in `src/modules/customers/server/actions.ts`.

`customerTags/{uid}`: internal segment tags (e.g. "VIP", "chargeback-risk"),
deliberately **not** stored on `users/{uid}` itself — that doc already
allows the owning customer to read their own profile, and a tag meant for
staff eyes only has no business being readable by the customer it's about.
Never client-readable or -writable; read/write only via the Admin SDK in
`src/modules/customers/server/{index,actions}.ts`, gated by `customers:manage`.
