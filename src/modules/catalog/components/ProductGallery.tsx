"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { MediaAsset } from "../schema";

const AUTO_ADVANCE_MS = 4000;

// Auto-advancing slideshow (one image at a time, cross-fades on a timer) —
// pauses while the pointer is over it, and the dots below double as manual
// controls. A single image just sits still; no dots, no timer.
export function ProductGallery({ media, title }: { media: MediaAsset[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (media.length <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % media.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [media.length, paused]);

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
      <div
        className="bg-rymx-card relative aspect-square w-full overflow-hidden rounded-md"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {media.map((asset, i) => (
          <Image
            key={asset.url}
            src={asset.url}
            alt={asset.alt || title}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority={i === 0}
            aria-hidden={i === index ? undefined : true}
            className={`object-cover transition-opacity duration-700 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
        ))}
      </div>
      {media.length > 1 && (
        <div className="flex justify-center gap-2">
          {media.map((asset, i) => (
            <button
              key={asset.url}
              type="button"
              aria-label={`Show image ${i + 1} of ${media.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? "bg-rymx-gold" : "bg-rymx-cream/20 hover:bg-rymx-cream/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
