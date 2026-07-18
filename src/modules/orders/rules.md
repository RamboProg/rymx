# orders module — Firestore rules

`orders/{orderId}`: a signed-in user may read only orders whose `uid` field
matches their own (guest orders have `uid: null` and are never
client-readable — a guest only ever sees their order via the confirmation
page returned directly from the checkout Server Action). All writes are
denied at the rules layer; the only way an order is ever created is the
Firestore transaction inside `src/modules/orders/server/checkout.ts`, which
re-validates price, stock, and discount eligibility server-side via the
Admin SDK before writing.
