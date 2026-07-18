"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { MediaManager } from "@/modules/media/components/MediaManager";
import {
  PRODUCT_STATUSES,
  productFormSchema,
  type Category,
  type MediaAsset,
  type Product,
  type ProductOption,
  type ProductStatus,
} from "../../schema";
import {
  createCategoryAction,
  createProductAction,
  updateProductAction,
} from "../../server/actions";

function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function optionsToText(options: ProductOption[]): string {
  return options.map((o) => `${o.name}: ${o.values.join(", ")}`).join("\n");
}

function parseOptionsText(text: string): ProductOption[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, valuesPart] = line.split(":");
      const values = (valuesPart ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return { name: (name ?? "").trim(), values };
    })
    .filter((o) => o.name && o.values.length > 0);
}

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "draft");
  const [category, setCategory] = useState(product?.category ?? "");
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [tagsText, setTagsText] = useState((product?.tags ?? []).join(", "));
  const [optionsText, setOptionsText] = useState(optionsToText(product?.options ?? []));
  const [media, setMedia] = useState<MediaAsset[]>(product?.media ?? []);
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "");
  const [publishAt, setPublishAt] = useState(toDateTimeLocal(product?.publishAt ?? null));
  const [categoryList, setCategoryList] = useState(categories);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onAddCategory() {
    if (!newCategoryTitle.trim()) return;
    const slugified = newCategoryTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const result = await createCategoryAction({ title: newCategoryTitle.trim(), slug: slugified });
    if (result.ok) {
      setCategoryList((c) => [...c, result.category]);
      setCategory(result.category.slug);
      setNewCategoryTitle("");
    } else {
      setError(result.error);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = productFormSchema.safeParse({
      title,
      slug,
      description,
      status,
      category: category || null,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      seoTitle,
      seoDescription,
      publishAt: publishAt ? new Date(publishAt) : null,
      media,
      options: parseOptionsText(optionsText),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = product
      ? await updateProductAction(product.id, parsed.data)
      : await createProductAction(parsed.data);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!product) {
      router.push(`/admin/products/${result.product.id}`);
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
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="status"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          >
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="category"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          >
            <option value="">None</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="publishAt"
            className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
          >
            Publish at (optional)
          </label>
          <input
            id="publishAt"
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Field
          id="newCategory"
          label="Add a category"
          value={newCategoryTitle}
          onChange={(e) => setNewCategoryTitle(e.target.value)}
        />
        <button
          type="button"
          onClick={onAddCategory}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-md border px-4 py-3 font-mono text-xs uppercase hover:text-[#12100a]"
        >
          Add
        </button>
      </div>

      <Field
        id="tags"
        label="Tags (comma-separated)"
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="options"
          className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase"
        >
          Options (one per line, e.g. &quot;Size: S, M, L&quot;)
        </label>
        <textarea
          id="options"
          rows={3}
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 font-mono text-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="seoTitle"
          label="SEO title"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
        />
        <Field
          id="seoDescription"
          label="SEO description"
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
        />
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
        {saving ? "Saving…" : product ? "Save product" : "Create product"}
      </Button>
    </form>
  );
}
