"use server";

import { revalidatePath } from "next/cache";
import {
  categoryInputSchema,
  categoryReorderSchema,
  productFormSchema,
  variantInputSchema,
  type Category,
  type Product,
  type Variant,
} from "../schema";
import { requireAdminPermission, type SessionClaims } from "@/modules/rbac/server";
import {
  createCategory,
  createProduct,
  createVariant,
  deleteCategory,
  deleteVariant,
  importProductsFromCsv,
  reorderCategories,
  updateCategory,
  updateProduct,
  updateVariant,
  type CsvImportSummary,
} from "./admin";

type ProductActionResult = { ok: true; product: Product } | { ok: false; error: string };
type VariantActionResult = { ok: true; variant: Variant } | { ok: false; error: string };
type VoidActionResult = { ok: true } | { ok: false; error: string };
type CategoryActionResult = { ok: true; category: Category } | { ok: false; error: string };
type CsvImportActionResult =
  | { ok: true; summary: CsvImportSummary }
  | { ok: false; error: string };

// Returns the caller's claims when they may write products (and passes the
// rate-limit), else null — so actions can both authorize and read staffUid.
async function requireProductsWrite(): Promise<SessionClaims | null> {
  return requireAdminPermission("products:write");
}

export async function createProductAction(rawInput: unknown): Promise<ProductActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = productFormSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const product = await createProduct(parsed.data);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return { ok: true, product };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create product" };
  }
}

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

export async function importProductsCsvAction(formData: FormData): Promise<CsvImportActionResult> {
  const claims = await requireProductsWrite();
  if (!claims) return { ok: false, error: "Forbidden" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };
  if (file.size === 0) return { ok: false, error: "The file is empty" };
  if (file.size > MAX_IMPORT_FILE_BYTES) return { ok: false, error: "File is too large (max 10 MB)" };

  try {
    const text = await file.text();
    const summary = await importProductsFromCsv(text, claims.uid);
    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/admin/inventory");
    revalidatePath("/shop");
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed" };
  }
}

export async function updateProductAction(
  productId: string,
  rawInput: unknown,
): Promise<ProductActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = productFormSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const product = await updateProduct(productId, parsed.data);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/shop");
    revalidatePath(`/shop/${product.slug}`);
    return { ok: true, product };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update product" };
  }
}

export async function createVariantAction(
  productId: string,
  rawInput: unknown,
): Promise<VariantActionResult> {
  const claims = await requireProductsWrite();
  if (!claims) return { ok: false, error: "Forbidden" };

  const parsed = variantInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const variant = await createVariant(productId, parsed.data, claims.uid);
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/shop");
    return { ok: true, variant };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create variant" };
  }
}

export async function updateVariantAction(
  productId: string,
  variantId: string,
  rawInput: unknown,
): Promise<VariantActionResult> {
  const claims = await requireProductsWrite();
  if (!claims) return { ok: false, error: "Forbidden" };

  const parsed = variantInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const variant = await updateVariant(productId, variantId, parsed.data, claims.uid);
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/shop");
    return { ok: true, variant };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update variant" };
  }
}

export async function deleteVariantAction(
  productId: string,
  variantId: string,
): Promise<VoidActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };
  await deleteVariant(productId, variantId);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/inventory");
  revalidatePath("/shop");
  return { ok: true };
}

export async function createCategoryAction(rawInput: unknown): Promise<CategoryActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = categoryInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const category = await createCategory(parsed.data);
    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return { ok: true, category };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create category" };
  }
}

export async function updateCategoryAction(
  id: string,
  rawInput: unknown,
): Promise<CategoryActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = categoryInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const category = await updateCategory(id, parsed.data);
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return { ok: true, category };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update category" };
  }
}

export async function deleteCategoryAction(id: string): Promise<VoidActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };
  try {
    await deleteCategory(id);
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete category" };
  }
}

export async function reorderCategoriesAction(rawInput: unknown): Promise<VoidActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = categoryReorderSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await reorderCategories(parsed.data.orderedIds);
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to reorder categories",
    };
  }
}
