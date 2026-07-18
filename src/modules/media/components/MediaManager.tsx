"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { MediaAsset } from "@/modules/catalog/schema";
import { uploadMediaAction } from "../server/actions";

export function MediaManager({
  media,
  onChange,
}: {
  media: MediaAsset[];
  onChange: (media: MediaAsset[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadMediaAction(formData);

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange([...media, result.asset]);
  }

  function moveMedia(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    // eslint-disable-next-line security/detect-object-injection -- index/target are bounds-checked array positions, not user-controlled keys
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  function updateAlt(index: number, alt: string) {
    onChange(media.map((m, i) => (i === index ? { ...m, alt } : m)));
  }

  function removeMedia(index: number) {
    onChange(media.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {media.map((asset, index) => (
          <div key={asset.url} className="flex flex-col gap-2">
            <div className="bg-rymx-card relative aspect-square overflow-hidden rounded-md">
              <Image
                src={asset.url}
                alt={asset.alt || "Product image"}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
            <input
              value={asset.alt}
              onChange={(e) => updateAlt(index, e.target.value)}
              placeholder="Alt text"
              className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-2 py-1 font-mono text-xs outline-none"
            />
            <div className="text-rymx-cream/50 flex justify-between gap-1 font-mono text-xs">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveMedia(index, -1)}
                className="disabled:opacity-30"
              >
                ← Move
              </button>
              <button
                type="button"
                disabled={index === media.length - 1}
                onClick={() => moveMedia(index, 1)}
                className="disabled:opacity-30"
              >
                Move →
              </button>
              <button
                type="button"
                onClick={() => removeMedia(index)}
                className="hover:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <label className="flex w-fit cursor-pointer flex-col gap-1">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          Add image
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={onFileSelected}
          className="text-rymx-cream/70 file:border-rymx-gold file:text-rymx-gold font-mono text-xs file:mr-3 file:rounded-full file:border file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-xs"
        />
      </label>
      {uploading && <p className="text-rymx-cream/50 font-mono text-xs">Uploading…</p>}
      {error && (
        <p role="alert" className="font-mono text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
