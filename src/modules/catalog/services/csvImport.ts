import { z } from "zod";
import { parseCsvRecords } from "@/lib/csv";
import {
  mediaAssetSchema,
  productOptionSchema,
  type MediaAsset,
  type ProductOption,
} from "../schema";

// Handles the columns Shopify's own "Export products" CSV produces — the
// same file format staff already have from a previous store, so import
// doesn't require a bespoke template. Each product spans multiple rows
// sharing one Handle: the first row carries the product-level fields
// (Title, Body, category, tags, status); every row (including the first)
// can carry one variant (Option values + price + stock) and/or one more
// product image.
export const parsedVariantSchema = z.object({
  optionValues: z.record(z.string(), z.string()),
  priceMinor: z.number().int().nonnegative(),
  compareAtMinor: z.number().int().nonnegative().nullable(),
  stock: z.number().int().nonnegative(),
});
export type ParsedVariant = z.infer<typeof parsedVariantSchema>;

export const parsedProductSchema = z.object({
  handle: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  tags: z.array(z.string()),
  status: z.enum(["draft", "active"]),
  options: z.array(productOptionSchema),
  variants: z.array(parsedVariantSchema).min(1),
  media: z.array(mediaAssetSchema),
});
export type ParsedProduct = z.infer<typeof parsedProductSchema>;

export type CsvImportResult = {
  products: ParsedProduct[];
  // Handles present in the file but skipped (no title on any row, or no
  // variant with a price) — reported back rather than silently dropped.
  skipped: { handle: string; reason: string }[];
};

// Strips Shopify's rich-text HTML down to plain text (our product
// description is rendered as plain, pre-wrapped text) — not a full HTML
// parser, just enough for the paragraph/list/bold markup a WYSIWYG editor
// like Shopify's actually produces.
export function stripHtml(html: string): string {
  if (!html) return "";
  const ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&rsquo;": "’",
    "&lsquo;": "‘",
    "&rdquo;": "”",
    "&ldquo;": "“",
    "&mdash;": "—",
    "&ndash;": "–",
  };
  const withBreaks = html
    .replace(/<\/(p|div|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const decoded = withBreaks.replace(
    /&[a-zA-Z#0-9]+;/g,
    // eslint-disable-next-line security/detect-object-injection -- m is a regex-matched HTML entity string (e.g. "&amp;"), just a lookup against our own fixed ENTITIES map
    (m) => ENTITIES[m] ?? m,
  );
  const lines = decoded.split("\n").map((line) => line.trim());
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line || collapsed[collapsed.length - 1] !== "") collapsed.push(line);
  }
  return collapsed.join("\n").trim();
}

const OPTION_COUNT = 3;

function rowOptionNames(rows: Record<string, string>[]): (string | null)[] {
  const names: (string | null)[] = Array(OPTION_COUNT).fill(null);
  for (const row of rows) {
    for (let i = 0; i < OPTION_COUNT; i++) {
      // eslint-disable-next-line security/detect-object-injection -- i is a fixed 0..2 loop counter, not user input
      if (names[i]) continue;
      const value = row[`Option${i + 1} Name`]?.trim();
      // eslint-disable-next-line security/detect-object-injection -- i is a fixed 0..2 loop counter, not user input
      if (value && value.toLowerCase() !== "title") names[i] = value;
    }
  }
  return names;
}

function collectOptions(rows: Record<string, string>[], names: (string | null)[]): ProductOption[] {
  const options: ProductOption[] = [];
  names.forEach((name, i) => {
    if (!name) return;
    const values: string[] = [];
    for (const row of rows) {
      const value = row[`Option${i + 1} Value`]?.trim();
      if (value && !values.includes(value)) values.push(value);
    }
    if (values.length > 0) options.push({ name, values });
  });
  return options;
}

function collectVariants(
  rows: Record<string, string>[],
  names: (string | null)[],
): ParsedVariant[] {
  return rows
    .filter((row) => row["Variant Price"]?.trim())
    .map((row) => {
      const optionValues: Record<string, string> = {};
      names.forEach((name, i) => {
        if (!name) return;
        const value = row[`Option${i + 1} Value`]?.trim();
        // eslint-disable-next-line security/detect-object-injection -- name comes from this CSV's own Option{n} Name column, not free-text user input into a shared object
        if (value) optionValues[name] = value;
      });
      const priceMinor = Math.round(Number.parseFloat(row["Variant Price"]) * 100);
      const compareRaw = row["Variant Compare At Price"]?.trim();
      const compareAtMinor = compareRaw ? Math.round(Number.parseFloat(compareRaw) * 100) : null;
      const stock = Number.parseInt(row["Variant Inventory Qty"] || "0", 10) || 0;
      return { optionValues, priceMinor, compareAtMinor, stock };
    })
    .filter((v) => Number.isFinite(v.priceMinor) && v.priceMinor >= 0);
}

function collectMedia(rows: Record<string, string>[], fallbackAlt: string): MediaAsset[] {
  const withPosition = rows
    .filter((row) => row["Image Src"]?.trim())
    .map((row) => ({
      url: row["Image Src"]!.trim(),
      alt: row["Image Alt Text"]?.trim() || fallbackAlt,
      position: Number.parseInt(row["Image Position"] || "0", 10) || 0,
    }))
    .sort((a, b) => a.position - b.position);

  const seen = new Set<string>();
  const media: MediaAsset[] = [];
  for (const { url, alt } of withPosition) {
    if (seen.has(url)) continue;
    seen.add(url);
    media.push({ url, alt });
  }
  return media;
}

// Shopify's own "Type" is a short, useful category ("T-shirt") when set;
// "Product Category" is its full taxonomy path ("Apparel & Accessories >
// ... > T-Shirts") when Type is blank — take the last segment of that
// instead of the whole path. Falls back to "Uncategorized" like Shopify
// itself does when neither is set.
function deriveCategory(row: Record<string, string>): string {
  const type = row.Type?.trim();
  if (type) return type;
  const category = row["Product Category"]?.trim();
  if (category && category.toLowerCase() !== "uncategorized") {
    const segments = category.split(">").map((s) => s.trim());
    return segments[segments.length - 1] || "Uncategorized";
  }
  return "Uncategorized";
}

export function parseShopifyProductsCsv(csvText: string): CsvImportResult {
  const records = parseCsvRecords(csvText);
  const byHandle = new Map<string, Record<string, string>[]>();
  for (const record of records) {
    const handle = record.Handle?.trim();
    if (!handle) continue;
    const rows = byHandle.get(handle) ?? [];
    rows.push(record);
    byHandle.set(handle, rows);
  }

  const products: ParsedProduct[] = [];
  const skipped: { handle: string; reason: string }[] = [];

  for (const [handle, rows] of byHandle) {
    const headRow = rows.find((r) => r.Title?.trim()) ?? rows[0]!;
    const title = headRow.Title?.trim();
    if (!title) {
      skipped.push({ handle, reason: "No title on any row" });
      continue;
    }

    const names = rowOptionNames(rows);
    const variants = collectVariants(rows, names);
    if (variants.length === 0) {
      skipped.push({ handle, reason: "No variant with a price" });
      continue;
    }

    const status = headRow.Status?.trim().toLowerCase() === "active" ? "active" : "draft";
    const tags = (headRow.Tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    products.push({
      handle,
      title,
      description: stripHtml(headRow["Body (HTML)"] ?? ""),
      category: deriveCategory(headRow),
      tags,
      status,
      options: collectOptions(rows, names),
      variants,
      media: collectMedia(rows, title),
    });
  }

  return { products, skipped };
}
