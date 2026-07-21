"use server";

import { revalidatePath } from "next/cache";
import { checkAdminMutationRateLimit } from "@/lib/security/rateLimit";
import {
  categoryInputSchema,
  productFormSchema,
  variantInputSchema,
  type Category,
  type Product,
  type Variant,
} from "../schema";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import {
  archiveProduct,
  createCategory,
  createProduct,
  createVariant,
  deleteVariant,
  updateProduct,
  updateVariant,
} from "./admin";

type ProductActionResult = { ok: true; product: Product } | { ok: false; error: string };
type VariantActionResult = { ok: true; variant: Variant } | { ok: false; error: string };
type VoidActionResult = { ok: true } | { ok: false; error: string };
type CategoryActionResult = { ok: true; category: Category } | { ok: false; error: string };

async function requireProductsWrite(): Promise<boolean> {
  const claims = await getSessionClaims();
  if (!hasPermission(claims, "products:write")) return false;
  return checkAdminMutationRateLimit(claims!.uid);
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

export async function archiveProductAction(productId: string): Promise<VoidActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };
  await archiveProduct(productId);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true };
}

export async function createVariantAction(
  productId: string,
  rawInput: unknown,
): Promise<VariantActionResult> {
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = variantInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const variant = await createVariant(productId, parsed.data);
    revalidatePath(`/admin/products/${productId}`);
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
  if (!(await requireProductsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = variantInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const variant = await updateVariant(productId, variantId, parsed.data);
    revalidatePath(`/admin/products/${productId}`);
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
    return { ok: true, category };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create category" };
  }
}
