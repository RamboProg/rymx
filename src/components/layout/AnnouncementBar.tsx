import Link from "next/link";
import { getContentSettings } from "@/modules/content/server";

export async function AnnouncementBar() {
  const content = await getContentSettings();
  if (!content.announcementEnabled || !content.announcementText) return null;

  return (
    <div className="bg-rymx-gold text-center font-mono text-xs font-semibold tracking-[0.1em] text-[#12100a] uppercase">
      {content.announcementHref ? (
        <Link href={content.announcementHref} className="block px-4 py-2">
          {content.announcementText}
        </Link>
      ) : (
        <p className="px-4 py-2">{content.announcementText}</p>
      )}
    </div>
  );
}
