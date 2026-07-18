import { getSessionClaims } from "@/modules/rbac/server";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const claims = await getSessionClaims();
  return <HeaderNav signedIn={claims !== null} />;
}
