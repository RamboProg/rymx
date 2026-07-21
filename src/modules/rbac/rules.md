# rbac module — Firestore rules

`auditLog/{entryId}`: internal record of staff/role-management actions,
never client-readable or -writable. Written only via
`src/modules/rbac/server/audit.ts`'s `logAdminAction`, called from
`src/modules/rbac/server/actions.ts` (invite/role-change/revoke). Staff
role/permission authority itself lives entirely in Firebase Auth custom
claims (not Firestore) — there is nothing else for this module's rules to
gate.
