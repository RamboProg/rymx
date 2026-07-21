import Link from "next/link";
import { getContentSettings } from "@/modules/content/server";
import { getSessionClaims } from "@/modules/rbac/server";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const [claims, content] = await Promise.all([getSessionClaims(), getContentSettings()]);

  return (
    <>
      {content.announcementEnabled && content.announcementText && (
        <div className="bg-rymx-gold text-center font-mono text-xs font-semibold tracking-[0.1em] text-[#12100a] uppercase">
          {content.announcementHref ? (
            <Link href={content.announcementHref} className="block px-4 py-2">
              {content.announcementText}
            </Link>
          ) : (
            <p className="px-4 py-2">{content.announcementText}</p>
          )}
        </div>
      )}
      <HeaderNav signedIn={claims !== null} />
    </>
  );
}
