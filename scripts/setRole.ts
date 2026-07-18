import { getAuth } from "firebase-admin/auth";
import { ROLES, type Role } from "../src/modules/rbac/schema";
import { DEFAULT_ROLE_PERMISSIONS } from "../src/modules/rbac/services/permissions";
import { getScriptAdminApp } from "./lib/firebaseAdmin";

const [, , uid, roleArg] = process.argv;

if (!uid || !roleArg) {
  console.error("Usage: pnpm role:set <uid> <owner|admin|staff|customer>");
  process.exit(1);
}

if (!(ROLES as readonly string[]).includes(roleArg)) {
  console.error(`Invalid role "${roleArg}". Must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

const role = roleArg as Role;

async function main() {
  const adminAuth = getAuth(getScriptAdminApp());
  await adminAuth.setCustomUserClaims(uid, {
    role,
    // eslint-disable-next-line security/detect-object-injection -- role was validated against ROLES above
    permissions: DEFAULT_ROLE_PERMISSIONS[role],
  });
  console.log(`Set role "${role}" for uid ${uid}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
