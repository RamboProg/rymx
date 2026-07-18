# Feature modules

Each domain lives in its own directory here, not spread across technical layers. Routes in
`src/app/` stay thin and compose these modules; they should not contain business logic.

```
src/modules/<feature>/
  schema.ts        # Zod schemas + TypeScript types — single source of truth for the domain
  server/          # server actions + data access (Admin SDK), server-only
  services/        # domain logic (pricing, discount evaluation, stock, state machines)
  components/      # UI for this feature (storefront and/or admin)
  hooks/           # client hooks
  __tests__/       # unit + rules tests, colocated
```

`_template/` mirrors this shape with empty placeholders — copy it when starting a new module
rather than inventing a new layout.

Shared, domain-agnostic code goes in `src/lib` (Firebase clients, validation helpers, security
helpers, money utilities) and `src/components/ui` (design-system primitives), not in a module.
