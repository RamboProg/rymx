import Image from "next/image";
import type { MediaAsset } from "../schema";

export function ProductGallery({ media, title }: { media: MediaAsset[]; title: string }) {
  if (media.length === 0) {
    return (
      <div className="bg-rymx-card flex aspect-square w-full items-center justify-center rounded-md">
        <span className="font-display text-rymx-cream/20 text-2xl tracking-[0.2em] uppercase">
          RYMX
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {media.map((asset, i) => (
        <div
          key={asset.url}
          className="bg-rymx-card relative aspect-square w-full overflow-hidden rounded-md"
        >
          <Image
            src={asset.url}
            alt={asset.alt || title}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}
