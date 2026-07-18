"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import type { MediaAsset, Product } from "@/modules/catalog/schema";
import { MediaManager } from "@/modules/media/components/MediaManager";
import { collectionInputSchema, type Collection } from "../../schema";
import { createCollectionAction, updateCollectionAction } from "../../server/actions";

function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CollectionForm({
  collection,
  products,
}: {
  collection?: Collection;
  products: Product[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [publishAt, setPublishAt] = useState(toDateTimeLocal(collection?.publishAt ?? null));
  const [media, setMedia] = useState<MediaAsset[]>(collection?.media ?? []);
  const [productIds, setProductIds] = useState<string[]>(collection?.productIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleProduct(id: string) {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = collectionInputSchema.safeParse({
      title,
      slug,
      description,
      media,
      productIds,
      publishAt: publishAt ? new Date(publishAt) : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = collection
      ? await updateCollectionAction(collection.id, parsed.data)
      : await createCollectionAction(parsed.data);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!collection) {
      router.push(`/admin/collections/${result.collection.id}`);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field id="slug" label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="publishAt"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          Publish at (optional — leave blank to go live immediately)
        </label>
        <input
          id="publishAt"
          type="datetime-local"
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold w-fit rounded-md border px-4 py-3 text-sm outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          Products
        </span>
        <div className="border-rymx-cream/10 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border p-3">
          {products.map((product) => (
            <label
              key={product.id}
              className="text-rymx-cream/80 flex items-center gap-2 font-mono text-sm"
            >
              <input
                type="checkbox"
                checked={productIds.includes(product.id)}
                onChange={() => toggleProduct(product.id)}
              />
              {product.title}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          Media
        </span>
        <MediaManager media={media} onChange={setMedia} />
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">Saved</p>}

      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? "Saving…" : collection ? "Save collection" : "Create collection"}
      </Button>
    </form>
  );
}
