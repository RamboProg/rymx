"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { slugify } from "@/lib/slug";
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

const NEW_OPTION_VALUE = "__new__";

type OptionRow = ProductOption & { isNewName: boolean };

function toOptionRows(
  options: ProductOption[],
  existingOptions: Record<string, string[]>,
): OptionRow[] {
  return options.map((option) => ({
    ...option,
    isNewName: !(option.name in existingOptions),
  }));
}

function emptyOptionRow(): OptionRow {
  return { name: "", values: [], isNewName: true };
}

function OptionValuesEditor({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const t = useTranslations("productForm");

  function addValue() {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  function removeValue(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="border-rymx-gold/40 text-rymx-gold flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs uppercase"
          >
            {value}
            <button
              type="button"
              onClick={() => removeValue(value)}
              aria-label={`Remove value ${value}`}
              className="hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-rymx-cream/40 font-mono text-xs">{t("fields.noValues")}</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={t("fields.addValue")}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={addValue}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-md border px-4 py-2 font-mono text-xs uppercase hover:text-[#12100a]"
        >
          {t("add")}
        </button>
      </div>
    </div>
  );
}

function OptionRowEditor({
  row,
  index,
  existingOptions,
  onChange,
  onRemove,
}: {
  row: OptionRow;
  index: number;
  existingOptions: Record<string, string[]>;
  onChange: (row: OptionRow) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("productForm");
  const nameOptions = [
    ...Object.keys(existingOptions).map((name) => ({ value: name, label: name })),
    { value: NEW_OPTION_VALUE, label: t("fields.newOption") },
  ];

  function onNameSelect(value: string) {
    if (value === NEW_OPTION_VALUE) {
      onChange({ name: "", values: [], isNewName: true });
      return;
    }
    // eslint-disable-next-line security/detect-object-injection -- value comes from this row's own Select options (existingOptions' keys), not free-text user input
    onChange({ name: value, values: existingOptions[value] ?? [], isNewName: false });
  }

  return (
    <div className="border-rymx-cream/20 flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {row.isNewName ? (
            <Field
              id={`option-name-${index}`}
              label={t("fields.optionName")}
              value={row.name}
              onChange={(e) => onChange({ ...row, name: e.target.value })}
              placeholder="e.g. Size"
            />
          ) : (
            <Select
              id={`option-name-${index}`}
              label={t("fields.optionName")}
              value={row.name}
              onValueChange={onNameSelect}
              options={nameOptions}
              placeholder={t("fields.selectOption")}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-rymx-cream/50 mt-6 font-mono text-xs uppercase hover:text-red-400"
        >
          {t("remove")}
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {t("fields.values")}
        </span>
        <OptionValuesEditor
          values={row.values}
          onChange={(values) => onChange({ ...row, values })}
        />
      </div>
    </div>
  );
}

export function ProductForm({
  product,
  categories,
  existingOptions,
}: {
  product?: Product;
  categories: Category[];
  existingOptions: Record<string, string[]>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "draft");
  const [category, setCategory] = useState(product?.category ?? "");
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [tagsText, setTagsText] = useState((product?.tags ?? []).join(", "));
  const [options, setOptions] = useState<OptionRow[]>(() =>
    toOptionRows(product?.options ?? [], existingOptions),
  );
  const [media, setMedia] = useState<MediaAsset[]>(product?.media ?? []);
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "");
  const [publishAt, setPublishAt] = useState<Date | null>(product?.publishAt ?? null);
  const [categoryList, setCategoryList] = useState(categories);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const t = useTranslations("productForm");

  // Slug is derived from the title and frozen once the product exists — never
  // editable. On create it previews live from the title; on edit it's the
  // stored slug (renaming the title won't change it).
  const slug = product ? product.slug : slugify(title);

  const statusOptions = PRODUCT_STATUSES.map((s) => ({ value: s, label: s }));
  const categoryOptions = categoryList.map((c) => ({ value: c.slug, label: c.title }));

  function updateOption(index: number, row: OptionRow) {
    setOptions((prev) => prev.map((o, i) => (i === index ? row : o)));
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function addOption() {
    setOptions((prev) => [
      ...prev,
      Object.keys(existingOptions).length > 0
        ? { name: "", values: [], isNewName: false }
        : emptyOptionRow(),
    ]);
  }

  async function onAddCategory() {
    if (!newCategoryTitle.trim()) return;
    const result = await createCategoryAction({ title: newCategoryTitle.trim() });
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
      description,
      status,
      category,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      seoTitle,
      seoDescription,
      publishAt,
      media,
      options: options
        .filter((o) => o.name.trim() && o.values.length > 0)
        .map((o) => ({ name: o.name.trim(), values: o.values })),
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
          value={slug}
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
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
        />
        <p className="text-rymx-cream/40 font-sans text-xs">{t("fields.descriptionHelp")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          id="status"
          label={t("fields.status")}
          value={status}
          onValueChange={(value) => setStatus(value as ProductStatus)}
          options={statusOptions}
          description={t("fields.statusHelp")}
        />

        <Select
          id="category"
          label={t("fields.category")}
          value={category}
          onValueChange={setCategory}
          options={categoryOptions}
          placeholder={t("selectCategory")}
          description={t("fields.categoryHelp")}
        />

        <DateTimePicker
          id="publishAt"
          label={t("fields.publishAt")}
          value={publishAt}
          onChange={setPublishAt}
        />
      </div>

      <div className="flex items-end gap-2">
        <Field
          id="newCategory"
          label={t("fields.addCategory")}
          value={newCategoryTitle}
          onChange={(e) => setNewCategoryTitle(e.target.value)}
          description={t("fields.addCategoryHelp")}
        />
        <button
          type="button"
          onClick={onAddCategory}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold mb-6 rounded-md border px-4 py-3 font-mono text-xs uppercase hover:text-[#12100a]"
        >
          {t("add")}
        </button>
      </div>

      <Field
        id="tags"
        label={t("fields.tags")}
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
        description={t("fields.tagsHelp")}
      />

      <div className="flex flex-col gap-3">
        <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {t("fields.options")}
        </span>
        <p className="text-rymx-cream/40 -mt-2 font-sans text-xs">{t("fields.optionsHelp")}</p>
        {options.map((row, index) => (
          <OptionRowEditor
            key={index}
            row={row}
            index={index}
            existingOptions={existingOptions}
            onChange={(next) => updateOption(index, next)}
            onRemove={() => removeOption(index)}
          />
        ))}
        <button
          type="button"
          onClick={addOption}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold w-fit rounded-md border px-4 py-2 font-mono text-xs uppercase hover:text-[#12100a]"
        >
          {t("addOption")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="seoTitle"
          label={t("fields.seoTitle")}
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          description={t("fields.seoTitleHelp")}
        />
        <Field
          id="seoDescription"
          label={t("fields.seoDescription")}
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          description={t("fields.seoDescriptionHelp")}
        />
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
        {saving ? t("saving") : product ? t("save") : t("create")}
      </Button>
    </form>
  );
}
