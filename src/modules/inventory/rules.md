# inventory module — Firestore rules

`inventoryAdjustments/{id}`: a server-only audit log of manual stock
changes. Never client-readable or client-writable — written exclusively by
`adjustStockAction` (`src/modules/inventory/server/actions.ts`) inside the
same transaction that updates the variant's `stock` field, gated by the
`products:write` permission.
