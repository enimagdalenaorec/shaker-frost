import "server-only";
import { cacheLife } from "next/cache";
import { publicDb } from "@/lib/db/public";
import type { ProductSummary, StoreOffer } from "./types";

// Catalog reads go through the contract views/RPCs only (CLAUDE.md §6).
// Catalog data changes only on reload, so a few minutes of caching is safe.

type Row = Record<string, unknown>;
const n = (v: unknown) => (v == null ? null : Number(v));
const s = (v: unknown) => (v == null ? null : String(v));

function toSummary(r: Row): ProductSummary {
  return {
    itemId: String(r.item_id),
    name: String(r.name),
    brand: s(r.brand),
    conceptId: s(r.concept_id),
    conceptGroup: s(r.concept_group),
    netQty: n(r.net_qty),
    sizeValue: n(r.size_value),
    sizeUnit: s(r.size_unit),
    packCount: n(r.pack_count) ?? 1,
    eko: Boolean(r.eko),
    provjeri: Boolean(r.provjeri),
    tags: (r.tags as string[] | null) ?? [],
    productUrl: s(r.product_url),
    chainCode: String(r.chain_code),
    chainName: String(r.chain_name),
    chainKind: String(r.chain_kind ?? "store"),
    price: Number(r.price),
    regularPrice: n(r.regular_price),
    isAkcija: Boolean(r.is_akcija),
    discountPct: n(r.discount_pct) ?? 0,
    unitPrice: n(r.unit_price_per_kg_l),
    nChains: n(r.n_chains) ?? 1,
    nStores: n(r.n_stores) ?? 1,
    anyAkcija: Boolean(r.any_akcija),
    maxDiscountPct: n(r.max_discount_pct) ?? 0,
    matchTier: n(r.match_tier) ?? undefined,
  };
}

export async function searchProducts(query: string, onlyAkcija = false): Promise<ProductSummary[]> {
  "use cache";
  cacheLife("minutes");
  const { data, error } = await publicDb().rpc("search_products", { p_query: query, p_only_akcija: onlyAkcija, p_limit: 60 });
  if (error) throw new Error(`search_products: ${error.message}`);
  return (data ?? []).map(toSummary);
}

export async function getTodaysDeals(limit = 8): Promise<ProductSummary[]> {
  "use cache";
  cacheLife("minutes");
  const { data, error } = await publicDb().rpc("todays_deals", { p_limit: limit });
  if (error) throw new Error(`todays_deals: ${error.message}`);
  return (data ?? []).map(toSummary);
}

/** Cheapest offer per product, for "Često u tvojoj košarici". */
export async function getBestOffers(itemIds: string[]): Promise<ProductSummary[]> {
  if (!itemIds.length) return [];
  const { data, error } = await publicDb().from("v_product_best").select("*").in("item_id", itemIds);
  if (error) throw new Error(`v_product_best: ${error.message}`);
  return (data ?? []).map(toSummary);
}

/** Every current store offer of one product, cheapest first. */
export async function getStoreOffers(itemId: string): Promise<StoreOffer[]> {
  const { data, error } = await publicDb().rpc("get_offers_for_items", { p_item_ids: [itemId] });
  if (error) throw new Error(`get_offers_for_items: ${error.message}`);
  return (data ?? []).map((r: Row) => ({
    chainCode: String(r.chain_code),
    chainName: String(r.chain_name),
    chainKind: String(r.chain_kind ?? "store"),
    storeId: String(r.store_id),
    storeAddress: s(r.store_address),
    isChainwide: Boolean(r.is_chainwide),
    price: Number(r.price),
    regularPrice: n(r.regular_price),
    isAkcija: Boolean(r.is_akcija),
    discountPct: n(r.discount_pct) ?? 0,
    priceDate: s(r.price_date),
  }));
}
