# discounts module — Firestore rules

`discounts/{code}` and `discountRedemptions/{redemptionId}`: never client-readable
or client-writable. Promo validation, application, and per-user redemption
tracking all happen server-side inside the checkout transaction
(`src/modules/orders/server/checkout.ts`), which reads/writes these
collections via the Admin SDK and bypasses rules entirely. Keeping them
unreadable also stops a client from enumerating valid codes or another
customer's redemption history.
