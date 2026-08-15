"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Field } from "@/components/ui/Input";
import { slugify } from "@/lib/slug";
import type { MediaAsset, Product } from "@/modules/catalog/schema";
import { MediaManager } from "@/modules/media/components/MediaManager";
import { collectionInputSchema, type Collection } from "../../schema";
import { createCollectionAction, updateCollectionAction } from "../../server/actions";

export function CollectionForm({
  collection,
  products,
}: {
  collection?: Collection;
  products: Product[];
}) {
  const router = useRouter();
  const t = useTranslations("collections");
  const [title, setTitle] = useState(collection?.title ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [publishAt, setPublishAt] = useState<Date | null>(collection?.publishAt ?? null);
  const [active, setActive] = useState(collection?.active ?? true);
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
      description,
      media,
      productIds,
      publishAt,
      active,
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
        <Field
          id="title"
          label={t("fields.title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          description={t("fields.titleHelp")}
        />
        <Field
          id="slug"
          label={t("fields.slug")}
          value={collection ? collection.slug : slugify(title)}
          readOnly
          description={t("fields.slugHelp")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          {t("fields.description")}
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
        />
        <p className="text-rymx-cream/40 font-sans text-xs">{t("fields.descriptionHelp")}</p>
      </div>

      <div className="w-fit">
        <DateTimePicker
          id="publishAt"
          label={t("fields.publishAt")}
          value={publishAt}
          onChange={setPublishAt}
        />
      </div>

      <Checkbox id="active" label={t("fields.active")} checked={active} onChange={setActive} />

      <div className="flex flex-col gap-2">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {t("fields.products")}
        </span>
        <div className="border-rymx-cream/10 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border p-3">
          {products.map((product) => (
            <Checkbox
              key={product.id}
              id={`product-${product.id}`}
              label={product.title}
              checked={productIds.includes(product.id)}
              onChange={() => toggleProduct(product.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {t("fields.media")}
        </span>
        <MediaManager media={media} onChange={setMedia} />
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">{t("saved")}</p>}

      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? t("saving") : collection ? t("save") : t("create")}
      </Button>
    </form>
  );
}
