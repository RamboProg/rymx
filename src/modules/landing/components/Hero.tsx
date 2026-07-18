"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { RymxSceneHandle } from "./RymxScene";

const RymxScene = dynamic(() => import("./RymxScene").then((m) => m.RymxScene), {
  ssr: false,
});

export function Hero() {
  const sceneRef = useRef<RymxSceneHandle>(null);

  return (
    <section className="bg-rymx-bg relative h-[100svh] min-h-[560px] w-full overflow-hidden">
      <RymxScene ref={sceneRef} className="absolute inset-0" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0)_55%),linear-gradient(0deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_40%)]"
      />

      <div className="absolute top-8 left-6 max-w-[80%] sm:top-11 sm:left-11 sm:max-w-[62%]">
        <p className="text-rymx-gold font-mono text-[11px] font-medium tracking-[0.32em]">
          RYMX — CAIRO / SS26
        </p>
        <h1 className="font-shoulders text-rymx-cream mt-4 text-[13vw] leading-[0.92] font-extrabold tracking-[-0.005em] uppercase sm:text-6xl lg:text-7xl">
          Reveal your
          <br />
          mistakes.
        </h1>
      </div>

      <div className="absolute right-6 bottom-8 sm:right-11 sm:bottom-11">
        <Button href="/shop" onClick={() => sceneRef.current?.reveal()}>
          Reveal the collection <span aria-hidden="true">→</span>
        </Button>
      </div>
    </section>
  );
}
