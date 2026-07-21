# shipments module — Firestore rules

`shipments/{shipmentId}`: a signed-in customer may read shipments belonging
to their own orders (looked up via the shipment's `orderId` field pointing
back at `orders/{orderId}.uid`) — so a customer can see fulfillment/tracking
status on `/account/orders/[id]`. All writes are denied at the rules layer;
shipment creation and status transitions happen server-side via
`src/modules/shipments/server/actions.ts`, gated by the `orders:fulfill`
permission.
