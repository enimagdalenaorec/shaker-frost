// Writes fixtures/catalog_mock.csv in the CLAUDE.md §4.2 import format (one row per product × store).
// Deterministic: same output on every run. Usage: npm run mock:build
import { mkdirSync, writeFileSync } from "node:fs";
import { CHAIN_FACTOR, CONCEPTS, PRODUCTS, STORES } from "./data";

const PRICE_DATE = "2026-10-06";
const COLUMNS = [
  "item_id", "barcode", "name", "brand", "image_url", "product_url",
  "concept_id", "concept", "concept_parent", "concept_group", "concept_confidence",
  "okus", "zasladeno", "namjena", "oblik", "obogaceno", "eko", "tags",
  "size_value", "size_unit", "pack_count",
  "vegan_status", "provjeri", "vegan_evidence",
  "energy_kcal", "fat", "saturated_fat", "carbohydrates", "sugars", "proteins", "salt", "fiber",
  "nutrition_source", "search_text",
  "store_chain", "chain_logo_url", "store_id", "store_address", "store_city",
  "price", "regular_price", "price_date",
];

// Small deterministic hash → [0, 1)
function rand(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
// Croatian shelf-style prices: x.x9
const shelf = (p: number) => Math.max(0.19, Number((Math.round(p * 10) / 10 - 0.01).toFixed(2)));

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

const rows: string[] = [COLUMNS.join(",")];
for (const p of PRODUCTS) {
  const concept = p.concept ? CONCEPTS[p.concept] : undefined;
  if (p.concept && !concept) throw new Error(`Unknown concept ${p.concept} on ${p.name}`);
  const n = p.n ?? null;

  for (const chain of p.chains) {
    const regular = shelf(p.base * CHAIN_FACTOR[chain] * (0.97 + rand(p.id + chain) * 0.06));
    const discount = p.akcija?.[chain];
    const price = discount ? shelf(regular * (1 - discount / 100)) : regular;
    const stores = STORES[chain].filter(([id]) => !p.onlyStores?.[chain] || p.onlyStores[chain].includes(id));

    for (const [storeId, address] of stores) {
      const record: Record<string, unknown> = {
        item_id: p.id,
        barcode: /^\d+$/.test(p.id) ? p.id : null,
        name: p.name,
        brand: p.brand,
        product_url: p.url ?? null,
        concept_id: p.concept ?? null,
        concept: concept?.[0],
        concept_parent: concept?.[1],
        concept_group: concept?.[2],
        concept_confidence: p.concept ? 0.9 : null,
        ...p.facets,
        eko: p.eko ?? false,
        tags: JSON.stringify(p.tags ?? []),
        size_value: p.size,
        size_unit: p.unit,
        pack_count: p.pack ?? 1,
        vegan_status: p.status ?? "vegan",
        provjeri: p.provjeri ?? false,
        vegan_evidence: JSON.stringify({ source: "mock", rule: "mock" }),
        energy_kcal: n?.[0], fat: n?.[1], saturated_fat: n?.[2], carbohydrates: n?.[3],
        sugars: n?.[4], proteins: n?.[5], salt: n?.[6], fiber: n?.[7],
        nutrition_source: n ? (p.nsrc ?? "deklaracija") : null,
        search_text: p.search,
        store_chain: chain,
        store_id: storeId,
        store_address: address,
        store_city: chain === "biobio" || chain === "tzh" ? null : "Zagreb",
        price,
        regular_price: regular,
        price_date: PRICE_DATE,
      };
      rows.push(COLUMNS.map((c) => csvCell(record[c])).join(","));
    }
  }
}

mkdirSync("fixtures", { recursive: true });
writeFileSync("fixtures/catalog_mock.csv", rows.join("\n") + "\n");
console.log(`Wrote fixtures/catalog_mock.csv: ${PRODUCTS.length} products, ${rows.length - 1} rows`);
