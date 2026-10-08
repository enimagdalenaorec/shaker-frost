"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/db/admin";
import { currentUserId, serverDb } from "@/lib/db/server";
import type { HistoryEntry, LocalBasketItem } from "@/lib/basket/local-store";

const UUID = /^[0-9a-f-]{36}$/i;

/** Attach recipes veganized as a guest on this device to the account that just logged in. */
export async function claimRecipes(ids: string[]) {
  const uid = await currentUserId();
  const clean = ids.filter((id) => UUID.test(id)).slice(0, 50);
  if (!uid || !clean.length) return 0;
  const { data } = await adminDb().from("recipes").update({ user_id: uid }).in("id", clean).is("user_id", null).select("id");
  return data?.length ?? 0;
}

/** Spremi / ukloni iz spremljenih. A guest recipe is claimed first. */
export async function setRecipeSaved(recipeId: string, saved: boolean): Promise<{ ok: boolean; needLogin?: boolean }> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, needLogin: true };
  if (!UUID.test(recipeId)) return { ok: false };
  const db = adminDb();
  await db.from("recipes").update({ user_id: uid }).eq("id", recipeId).is("user_id", null);
  const { data } = await db
    .from("recipes")
    .update({ saved_at: saved ? new Date().toISOString() : null })
    .eq("id", recipeId)
    .eq("user_id", uid)
    .select("id");
  revalidatePath("/recepti");
  return { ok: Boolean(data?.length) };
}

export async function deleteRecipe(recipeId: string) {
  const db = await serverDb(); // RLS: only the owner can delete
  await db.from("recipes").delete().eq("id", recipeId);
  revalidatePath("/recepti");
}

// ── basket sync for logged-in users (the local store stays the working copy) ────────────────────

export async function pullBasket(): Promise<{ items: LocalBasketItem[]; history: HistoryEntry[] } | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const db = await serverDb();
  const { data: basket } = await db.from("baskets").select("id").eq("user_id", uid).maybeSingle();
  const [{ data: items }, { data: history }] = await Promise.all([
    basket ? db.from("basket_items").select("*").eq("basket_id", basket.id).order("created_at") : Promise.resolve({ data: [] }),
    db.from("basket_history").select("*").eq("user_id", uid).order("added_at", { ascending: false }).limit(300),
  ]);
  return {
    items: (items ?? []).map((r) => ({
      id: r.id,
      kind: r.kind as "product" | "concept",
      label: r.label ?? r.concept_id ?? r.item_id ?? "",
      itemId: r.item_id ?? undefined,
      conceptId: r.concept_id ?? undefined,
      facets: (r.facets as Record<string, string>) ?? {},
      requiredQty: r.required_qty == null ? null : Number(r.required_qty),
      requiredUnit: (r.required_unit as "g" | "ml" | "kom" | null) ?? null,
      packages: r.packages,
      pinnedItemId: r.pinned_item_id,
      recipeId: r.recipe_id ?? undefined,
      forIngredient: r.for_ingredient ?? undefined,
      addedAt: new Date(r.created_at).getTime(),
    })),
    history: (history ?? []).reverse().map((h) => ({
      kind: h.kind as "product" | "concept",
      label: h.label ?? "",
      itemId: h.item_id ?? undefined,
      conceptId: h.concept_id ?? undefined,
      facets: (h.facets as Record<string, string>) ?? {},
      source: h.source as HistoryEntry["source"],
      at: new Date(h.added_at).getTime(),
    })),
  };
}

/** Replace the account's basket with these items and append new history entries. */
export async function pushBasket(items: LocalBasketItem[], newHistory: HistoryEntry[]) {
  const uid = await currentUserId();
  if (!uid) return false;
  const db = await serverDb();
  const { data: basket, error } = await db.from("baskets").upsert({ user_id: uid }, { onConflict: "user_id" }).select("id").single();
  if (error || !basket) return false;
  await db.from("basket_items").delete().eq("basket_id", basket.id);
  const rows = items
    .filter((i) => (i.kind === "product" ? i.itemId : i.conceptId))
    .slice(0, 60)
    .map((i) => ({
      id: UUID.test(i.id) ? i.id : undefined,
      basket_id: basket.id,
      kind: i.kind,
      label: i.label,
      for_ingredient: i.forIngredient ?? null,
      item_id: i.itemId ?? null,
      concept_id: i.conceptId ?? null,
      facets: i.facets ?? {},
      required_qty: i.requiredQty ?? null,
      required_unit: i.requiredUnit ?? null,
      packages: Math.max(1, i.packages),
      pinned_item_id: i.pinnedItemId ?? null,
      recipe_id: null, // not needed for sync; avoids FK failures if the recipe was deleted
      created_at: new Date(i.addedAt).toISOString(),
    }));
  if (rows.length) await db.from("basket_items").insert(rows);
  if (newHistory.length) {
    await db.from("basket_history").insert(
      newHistory.slice(-100).map((h) => ({
        user_id: uid,
        kind: h.kind,
        label: h.label,
        item_id: h.itemId ?? null,
        concept_id: h.conceptId ?? null,
        facets: h.facets ?? {},
        source: h.source,
        added_at: new Date(h.at).toISOString(),
      })),
    );
  }
  return true;
}
