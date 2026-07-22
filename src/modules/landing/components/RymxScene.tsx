"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const GOLD = new THREE.Color("#e8c170");
const WHITE = new THREE.Color("#f4f1ea");
const STL_PATH = "/rymx_3d_logo.stl";

export type RymxSceneHandle = {
  reveal: () => void;
};

const REVEAL_DURATION_MS = 1300;

let geomPromise: Promise<THREE.BufferGeometry> | undefined;
function loadGeom(): Promise<THREE.BufferGeometry> {
  if (geomPromise) return geomPromise;
  geomPromise = new Promise((resolve, reject) => {
    new STLLoader().load(
      STL_PATH,
      (g) => {
        g.center();
        g.computeBoundingBox();
        const s = new THREE.Vector3();
        g.boundingBox!.getSize(s);
        if (s.x <= s.y && s.x <= s.z) g.rotateY(Math.PI / 2);
        else if (s.y <= s.x && s.y <= s.z) g.rotateX(Math.PI / 2);
        g.center();
        g.computeBoundingBox();
        g.boundingBox!.getSize(s);
        g.rotateZ(Math.PI);
        const maxd = Math.max(s.x, s.y) || 1;
        const scl = 3.1 / maxd;
        g.scale(scl, scl, scl);
        resolve(g);
      },
      undefined,
      reject,
    );
  });
  return geomPromise;
}

function makeEnv(renderer: THREE.WebGLRenderer, mood: number) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#050505";
  x.fillRect(0, 0, 1024, 512);
  let g = x.createRadialGradient(512, 70, 10, 512, 70, 430);
  g.addColorStop(0, "rgba(244,241,234,0.95)");
  g.addColorStop(1, "rgba(244,241,234,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);
  g = x.createRadialGradient(512, 470, 10, 512, 470, 560);
  g.addColorStop(0, `rgba(232,193,112,${0.95 * mood})`);
  g.addColorStop(1, "rgba(232,193,112,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);
  [230, 800].forEach((cx) => {
    g = x.createRadialGradient(cx, 256, 5, cx, 256, 240);
    g.addColorStop(0, `rgba(232,193,112,${0.7 * mood})`);
    g.addColorStop(1, "rgba(232,193,112,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 1024, 512);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

type RingItem = {
  m: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  i: number;
  gold: boolean;
  ax: THREE.Vector3;
};

function buildOrbitingRings() {
  const g = new THREE.Group();
  const items: RingItem[] = [];
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.TorusGeometry(2.1 + i * 0.52, 0.03, 14, 200);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      transparent: true,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI * (0.15 + i * 0.12);
    m.rotation.y = Math.PI * (0.1 + i * 0.14);
    g.add(m);
    items.push({
      m,
      mat,
      i,
      gold: i % 2 === 0,
      ax: new THREE.Vector3(Math.sin(i * 1.4), Math.cos(i * 1.1), 0.35).normalize(),
    });
  }
  const update = (t: number, ease: number) => {
    items.forEach((it) => {
      it.m.rotateOnAxis(it.ax, 0.0024 + it.i * 0.0006);
      const br = 0.6 + (0.5 + 0.5 * Math.sin(t * 0.8 + it.i)) * (it.gold ? 1.95 : 1.15);
      it.mat.color.copy(it.gold ? GOLD : WHITE).multiplyScalar(br * ease);
    });
    g.rotation.y = t * 0.05;
  };
  return { group: g, update };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function supportsWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export const RymxScene = forwardRef<RymxSceneHandle, { className?: string }>(function RymxScene(
  { className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealRef = useRef({ active: false, start: 0 });
  const [fallback, setFallback] = useState(false);

  useImperativeHandle(ref, () => ({
    reveal: () => {
      revealRef.current = { active: true, start: performance.now() };
    },
  }));

  useEffect(() => {
    if (prefersReducedMotion() || !supportsWebGL()) {
      setFallback(true);
      return;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let dead = false;
    const mood = 1.0;

    const w = container.clientWidth || 900;
    const h = container.clientHeight || 600;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0, 7.6);
    scene.add(camera);

    const flashMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const flashPlane = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), flashMat);
    flashPlane.position.set(0, 0, -2);
    flashPlane.renderOrder = 999;
    flashPlane.frustumCulled = false;
    camera.add(flashPlane);

    scene.environment = makeEnv(renderer, mood);
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8ea0ff, 0.5);
    rim.position.set(-4, -2, -3);
    scene.add(rim);
    const goldPt = new THREE.PointLight(0xffcf7a, 55, 45);
    goldPt.position.set(0, 0, 4);
    scene.add(goldPt);

    const group = new THREE.Group();
    scene.add(group);
    loadGeom()
      .then((g) => {
        if (dead) return;
        const mat = new THREE.MeshStandardMaterial({
          color: 0x141418,
          metalness: 1.0,
          roughness: 0.02,
          envMapIntensity: 2.4 * mood,
        });
        group.add(new THREE.Mesh(g, mat));
      })
      .catch((e) => console.error("STL load failed", e));

    const rings = buildOrbitingRings();
    scene.add(rings.group);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomTarget = 0.75 * mood;
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), bloomTarget, 0.7, 0.16);
    composer.addPass(bloom);

    let px = 0,
      py = 0,
      tx = 0,
      ty = 0;
    const onPointerMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      if (!r.width) return;
      tx = Math.max(-1.4, Math.min(1.4, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      ty = Math.max(-1.4, Math.min(1.4, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let visible = true;
    const resize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!cw || !ch) return;
      renderer.setSize(cw, ch, false);
      composer.setSize(cw, ch);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => (visible = en.isIntersecting)),
      { threshold: 0.01 },
    );
    io.observe(container);

    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const t = (now - start) / 1000;
      const intro = Math.min(t / 1.4, 1);
      const ease = 1 - Math.pow(1 - intro, 3);
      const b = 1.7;
      const p = intro - 1;
      const back = 1 + (b + 1) * p * p * p + b * p * p;

      px += (tx - px) * 0.06;
      py += (ty - py) * 0.06;

      let burst = 0;
      let revBloom = 0;
      const reveal = revealRef.current;
      if (reveal.active) {
        let rp = (now - reveal.start) / REVEAL_DURATION_MS;
        if (rp >= 1) {
          rp = 1;
          reveal.active = false;
        }
        burst = Math.sin(rp * Math.PI);
        let fo: number;
        if (rp < 0.38) fo = 0;
        else if (rp < 0.6) fo = (rp - 0.38) / 0.22;
        else if (rp < 0.72) fo = 1;
        else fo = Math.max(0, 1 - (rp - 0.72) / 0.28);
        flashMat.opacity = fo;
        revBloom = Math.sin(rp * Math.PI) * 2.6;
      } else {
        flashMat.opacity = 0;
      }

      const introSpin = (1 - ease) * Math.PI * 1.4;
      group.rotation.y = t * 0.32 + px * 0.55 + introSpin + burst * 6.0;
      group.rotation.x = -py * 0.32;
      group.scale.setScalar((0.05 + 0.95 * back) * (1 + burst * 2.4));
      group.position.z = burst * 3.2;

      goldPt.position.set(
        Math.cos(t * 0.6) * 3.6,
        Math.sin(t * 0.7) * 2.1,
        3.2 + Math.sin(t * 0.5) * 1.3,
      );

      rings.group.scale.setScalar(1 + burst * 1.8);
      rings.update(t, ease);
      bloom.strength = bloomTarget * ease + revBloom;
      composer.render();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      ro.disconnect();
      io.disconnect();
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  if (fallback) {
    return (
      <div
        ref={containerRef}
        className={`bg-rymx-card flex items-center justify-center ${className ?? ""}`}
      >
        <span className="font-display text-rymx-gold text-4xl font-bold tracking-[0.15em]">
          RYMX
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
});
