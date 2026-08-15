"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { slugify } from "@/lib/slug";
import type { Category } from "../../schema";
import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  updateCategoryAction,
} from "../../server/actions";

export function CategoriesManager({ categories: initial }: { categories: Category[] }) {
  const router = useRouter();
  const t = useTranslations("categories");
  const [categories, setCategories] = useState(initial);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onCreate() {
    if (!newTitle.trim()) return;
    setError(null);
    setPending(true);
    const result = await createCategoryAction({ title: newTitle.trim() });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCategories((c) => [...c, result.category]);
    setNewTitle("");
    router.refresh();
  }

  async function onRename(id: string) {
    if (!editTitle.trim()) return;
    setError(null);
    setPending(true);
    const result = await updateCategoryAction(id, { title: editTitle.trim() });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCategories((c) => c.map((cat) => (cat.id === id ? result.category : cat)));
    setEditingId(null);
    router.refresh();
  }

  async function onDelete(id: string) {
    setError(null);
    setPending(true);
    const result = await deleteCategoryAction(id);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCategories((c) => c.filter((cat) => cat.id !== id));
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    // index/target are bounded numeric array indices (target guarded above), not user-controlled keys.
    // eslint-disable-next-line security/detect-object-injection
    [next[index], next[target]] = [next[target]!, next[index]!];
    setCategories(next);
    setError(null);
    const result = await reorderCategoriesAction({ orderedIds: next.map((c) => c.id) });
    if (!result.ok) {
      setError(result.error);
      setCategories(categories); // revert
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            id="new-category"
            label={t("add")}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            description={
              newTitle.trim()
                ? t("addHelpSlug", { slug: slugify(newTitle) || "—" })
                : t("addHelpEmpty")
            }
          />
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={onCreate}
          className="w-fit justify-center"
        >
          {t("addButton")}
        </Button>
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}

      {categories.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("colOrder")}</Th>
              <Th>{t("colTitle")}</Th>
              <Th>{t("colSlug")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={category.id}>
                <Td>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pending || index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={t("moveUp")}
                      className="text-rymx-cream/60 hover:text-rymx-gold disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={pending || index === categories.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={t("moveDown")}
                      className="text-rymx-cream/60 hover:text-rymx-gold disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                </Td>
                <Td>
                  {editingId === category.id ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    category.title
                  )}
                </Td>
                <Td>
                  <span className="text-rymx-cream/50 font-mono text-xs">{category.slug}</span>
                </Td>
                <Td>
                  <div className="flex gap-3">
                    {editingId === category.id ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onRename(category.id)}
                          className="hover:text-rymx-gold"
                        >
                          {t("save")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-rymx-cream/50 hover:text-rymx-cream"
                        >
                          {t("cancel")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditTitle(category.title);
                          }}
                          className="hover:text-rymx-gold"
                        >
                          {t("rename")}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onDelete(category.id)}
                          className="hover:text-red-400"
                        >
                          {t("delete")}
                        </button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
