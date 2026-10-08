import "server-only";
import { publicDb } from "@/lib/db/public";
import { facetMatches } from "@/lib/catalog/facets";
import type { BasketItem, Offer, Unit } from "@/lib/basket/types";
import type { z } from "zod";
import type { BasketItemInput } from "@/lib/basket/view";

type Input = z.output<typeof BasketItemInput>;
type Row = Record<string, unknown>;

const FACET_KEYS = ["okus", "zasladeno", "namjena", "oblik"] as const;
const num = (v: unknown) => (v == null ? null : Number(v));

function toOffer(r: Row, facets?: Record<string, string>): Offer {
  return {
    itemId: String(r.item_id),
    name: String(r.name),
    brand: r.brand == null ? null : String(r.brand),
    chainCode: String(r.chain_code),
    chainName: String(r.chain_name),
    storeId: String(r.store_id),
    storeAddress: r.store_address == null ? null : String(r.store_address),
    isChainwide: Boolean(r.is_chainwide) || r.chain_kind === "webshop",
    price: Number(r.price),
    regularPrice: num(r.regular_price),
    isAkcija: Boolean(r.is_akcija),
    netQty: num(r.net_qty),
    unit: (r.size_unit as Unit | null) ?? null,
    provjeri: Boolean(r.provjeri),
    conceptGroup: r.concept_group == null ? null : String(r.concept_group),
    chainKind: String(r.chain_kind ?? "store"),
    nutrition: {
      energy_kcal: num(r.energy_kcal),
      fat: num(r.fat),
      saturated_fat: num(r.saturated_fat),
      carbohydrates: num(r.carbohydrates),
      sugars: num(r.sugars),
      proteins: num(r.proteins),
      salt: num(r.salt),
      fiber: num(r.fiber),
    },
    // how many of the AI-chosen facets (e.g. {"okus":"dimljeno"}) this product matches
    facetScore: facets
      ? Object.entries(facets).filter(([k, v]) => (FACET_KEYS as readonly string[]).includes(k) && facetMatches(r, k, v)).length
      : 0,
  };
}

/** Attach every current offer to each basket item: a product's own offers, or all offers in a concept. */
export async function loadBasketItems(items: Input[], excludeTags: string[]): Promise<BasketItem[]> {
  const productIds = [...new Set(items.filter((i) => i.kind === "product" && i.itemId).map((i) => i.itemId!))];
  const conceptIds = [...new Set(items.filter((i) => i.kind === "concept" && i.conceptId).map((i) => i.conceptId!))];
  const db = publicDb();

  const [byProduct, byConcept] = await Promise.all([
    productIds.length ? db.rpc("get_offers_for_items", { p_item_ids: productIds }) : Promise.resolve({ data: [], error: null }),
    conceptIds.length
      ? db.rpc("get_offers", { p_concept_ids: conceptIds, p_exclude_tags: excludeTags })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (byProduct.error) throw new Error(byProduct.error.message);
  if (byConcept.error) throw new Error(byConcept.error.message);
  const productRows = (byProduct.data ?? []) as Row[];
  const conceptRows = (byConcept.data ?? []) as Row[];

  return items.map((i) => ({
    id: i.id,
    kind: i.kind,
    label: i.label,
    requiredQty: i.requiredQty ?? null,
    requiredUnit: i.requiredUnit ?? null,
    packages: i.packages,
    pinnedItemId: i.pinnedItemId ?? null,
    candidates:
      i.kind === "product"
        ? productRows.filter((r) => r.item_id === i.itemId).map((r) => toOffer(r))
        : conceptRows.filter((r) => r.concept_id === i.conceptId).map((r) => toOffer(r, i.facets)),
  }));
}
