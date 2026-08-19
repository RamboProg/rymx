"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaAsset } from "../schema";

const AUTO_ADVANCE_MS = 4000;

// Horizontal snap carousel in admin media order: auto-advances, and the
// user can swipe/scroll normally (touch or trackpad) or tap the dots.
export function ProductGallery({ media, title }: { media: MediaAsset[]; title: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollToIndex = useCallback((next: number, behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: next * el.clientWidth, behavior });
  }, []);

  useEffect(() => {
    if (media.length <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % media.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [media.length, paused, scrollToIndex]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.min(Math.max(next, 0), media.length - 1));
  }

  function goTo(i: number) {
    setIndex(i);
    scrollToIndex(i);
  }

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
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex h-full w-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
        >
          {media.map((asset, i) => (
            <div key={`${asset.url}-${i}`} className="relative h-full w-full shrink-0 snap-center">
              <Image
                src={asset.url}
                alt={asset.alt || title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority={i === 0}
                draggable={false}
                className="object-cover select-none"
              />
            </div>
          ))}
        </div>
      </div>
      {media.length > 1 && (
        <div className="flex justify-center gap-2">
          {media.map((asset, i) => (
            <button
              key={`${asset.url}-dot-${i}`}
              type="button"
              aria-label={`Show image ${i + 1} of ${media.length}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
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
