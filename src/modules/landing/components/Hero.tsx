"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { REVEAL_DURATION_MS } from "../revealTiming";
import type { RymxSceneHandle } from "./RymxScene";

const RymxScene = dynamic(() => import("./RymxScene").then((m) => m.RymxScene), {
  ssr: false,
});

export function Hero({
  eyebrow,
  headline,
  cta,
}: {
  eyebrow?: string;
  headline?: string;
  cta?: string;
}) {
  // CMS-supplied copy (props) always wins; these are just the localized
  // fallbacks shown until content settings override them.
  const t = useTranslations("home");
  const resolvedEyebrow = eyebrow ?? t("eyebrow");
  const resolvedHeadline = headline ?? t("headline");
  const resolvedCta = cta ?? t("cta");
  const sceneRef = useRef<RymxSceneHandle>(null);
  const router = useRouter();
  const navigatingRef = useRef(false);

  function onRevealClick(e: React.MouseEvent<HTMLElement>) {
    // Middle-click / cmd-click / ctrl-click open in a new tab and never
    // reach this handler, so href="/shop" keeps working for those and for
    // no-JS/crawlers; a plain left-click gets the delayed reveal instead.
    e.preventDefault();
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    sceneRef.current?.reveal();
    // Wait for the burst to finish and hold on the gold flash, then swap to
    // /shop while that flash still covers the frame (no idle-state snap-back).
    setTimeout(() => router.push("/shop"), REVEAL_DURATION_MS);
  }

  return (
    <section className="bg-rymx-bg relative min-h-[560px] w-full flex-1 overflow-hidden">
      <RymxScene ref={sceneRef} className="absolute inset-0" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0)_55%),linear-gradient(0deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_40%)]"
      />

      <div className="absolute top-8 left-6 max-w-[80%] sm:top-11 sm:left-11 sm:max-w-[62%]">
        <p className="text-rymx-gold font-mono text-[11px] font-medium tracking-[0.32em]">
          {resolvedEyebrow}
        </p>
        <h1 className="font-shoulders text-rymx-cream mt-4 text-[13vw] leading-[0.92] font-extrabold tracking-[-0.005em] uppercase sm:text-6xl lg:text-7xl">
          {resolvedHeadline}
        </h1>
      </div>

      <div className="absolute right-6 bottom-8 sm:right-11 sm:bottom-11">
        <Button href="/shop" onClick={onRevealClick}>
          {resolvedCta} <span aria-hidden="true">→</span>
        </Button>
      </div>
    </section>
  );
}
