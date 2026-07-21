# returns module — Firestore rules

`returns/{returnId}`: a signed-in customer may read returns belonging to
their own orders (looked up via the return's `orderId` field pointing back
at `orders/{orderId}.uid`) — so a customer can see RMA/refund status on
`/account/orders/[id]`. All writes are denied at the rules layer; RMA
creation and every status transition (approve/reject/restock) happen
server-side via `src/modules/returns/server/actions.ts`, gated by the
`orders:fulfill` permission. Restocking runs inside a Firestore transaction
alongside the matching `inventoryAdjustments` audit entries (shared with
order-cancellation restock via `applyStockDeltasInTransaction`).
