# cart module — Firestore rules

`carts/{uid}`: the owning user may read their own cart document (so a client
can, if ever needed, read it directly for debugging). All mutation happens
server-side via Server Actions (`src/modules/cart/server/actions.ts`) using
the Admin SDK, which bypasses rules — direct client writes are denied
entirely so a client can never set an arbitrary price or quantity. Guest
carts are never persisted to Firestore at all (localStorage only, resolved
through the stateless `resolveCartAction`), so there is no unauthenticated
cart document to protect.
