import { getSessionClaims } from "@/modules/rbac/server";
import { isStaff } from "@/modules/rbac/services/permissions";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const claims = await getSessionClaims();
  return <HeaderNav signedIn={claims !== null} staff={isStaff(claims?.role)} />;
}
