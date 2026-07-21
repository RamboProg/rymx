# orders module — Firestore rules

`orders/{orderId}`: a signed-in user may read only orders whose `uid` field
matches their own (guest orders have `uid: null` and are never
client-readable — a guest only ever sees their order via the confirmation
page returned directly from the checkout Server Action). All writes are
denied at the rules layer; the only way an order is ever created is the
Firestore transaction inside `src/modules/orders/server/checkout.ts`, which
re-validates price, stock, and discount eligibility server-side via the
Admin SDK before writing.

`orders/{orderId}/notes/{noteId}`: internal staff notes, never
client-readable at all (not even by the order's own customer) — written by
`addOrderNoteAction`, gated by the `orders:fulfill` permission check in
`src/modules/orders/server/actions.ts` (there's nothing for a Firestore rule
to gate here either, same reasoning as catalog/collections in Phase 6).
