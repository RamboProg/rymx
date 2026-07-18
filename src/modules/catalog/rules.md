# catalog module — Firestore rules

`products/{productId}`: publicly readable only while `status == "active"`
(draft/archived products stay invisible to unauthenticated storefront reads).
`products/{productId}/variants/{variantId}` inherits the same visibility from
its parent product. All writes are denied at the rules layer — product/variant
mutation happens server-side via the Admin SDK (Server Actions, Phase 6),
which bypasses rules entirely.

`categories/{categoryId}`: public read (plain taxonomy, nothing sensitive).
Writes denied — admin-managed via the Admin SDK.
