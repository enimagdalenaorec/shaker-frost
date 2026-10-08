import { describe, expect, it } from "vitest";
import { costOf, optimizeBasket } from "./optimize";
import type { BasketItem, Offer } from "./types";

let n = 0;
function offer(p: Partial<Offer> & Pick<Offer, "itemId" | "chainCode" | "price">): Offer {
  return {
    name: p.itemId,
    brand: null,
    chainName: p.chainCode.toUpperCase(),
    storeId: `${p.chainCode}:all`,
    storeAddress: null,
    isChainwide: true,
    regularPrice: null,
    isAkcija: false,
    netQty: 1000,
    unit: "ml",
    provjeri: false,
    nutrition: {},
    facetScore: 0,
    ...p,
  };
}
function concept(label: string, candidates: Offer[], need = 500, unit: "g" | "ml" = "ml"): BasketItem {
  return { id: `i${n++}`, kind: "concept", label, requiredQty: need, requiredUnit: unit, candidates };
}

describe("costOf", () => {
  it("rounds packages up and reports the used share", () => {
    const item = concept("mlijeko", [], 1500);
    const c = costOf(item, offer({ itemId: "a", chainCode: "k", price: 2, netQty: 1000 }));
    expect(c).toEqual({ packages: 2, lineCost: 4, usedCost: 3, sizeKnown: true });
  });
  it("assumes one package when the size is unknown", () => {
    const item = concept("mlijeko", [], 1500);
    const c = costOf(item, offer({ itemId: "a", chainCode: "k", price: 2, netQty: null }));
    expect(c).toMatchObject({ packages: 1, lineCost: 2, usedCost: null, sizeKnown: false });
  });
  it("uses packages for product items", () => {
    const item: BasketItem = { id: "p", kind: "product", label: "kruh", packages: 3, candidates: [] };
    expect(costOf(item, offer({ itemId: "kruh", chainCode: "k", price: 1.5 })).lineCost).toBe(4.5);
  });
});

describe("cheapest", () => {
  it("picks the cheapest offer per item across chains", () => {
    const milk = concept("mlijeko", [
      offer({ itemId: "m1", chainCode: "konzum", price: 2.5 }),
      offer({ itemId: "m2", chainCode: "lidl", price: 1.9 }),
    ]);
    const r = optimizeBasket([milk], { strategy: "cheapest" });
    expect(r.total).toBe(1.9);
    expect(r.groups[0].chainCode).toBe("lidl");
    expect(r.saving).toBe(0.6);
  });

  it("ignores provjeri offers and reports items with no usable offer", () => {
    const tofu = concept("tofu", [offer({ itemId: "t", chainCode: "spar", price: 1, provjeri: true })]);
    const none = concept("seitan", []);
    const r = optimizeBasket([tofu, none], { strategy: "cheapest" });
    expect(r.total).toBe(0);
    expect(r.unpriced.map((u) => u.reason)).toEqual(["only_provjeri", "no_offers"]);
  });

  it("respects the AI facet choice before price", () => {
    const milk = concept("mlijeko", [
      offer({ itemId: "vanilla", chainCode: "lidl", price: 1.0, facetScore: 0 }),
      offer({ itemId: "plain", chainCode: "konzum", price: 2.0, facetScore: 2 }),
    ]);
    const r = optimizeBasket([milk], { strategy: "cheapest" });
    expect(r.groups[0].lines[0].offer.itemId).toBe("plain");
  });

  it("respects a pinned product", () => {
    const milk = concept("mlijeko", [
      offer({ itemId: "m1", chainCode: "konzum", price: 2.5 }),
      offer({ itemId: "m2", chainCode: "lidl", price: 1.9 }),
    ]);
    milk.pinnedItemId = "m1";
    expect(optimizeBasket([milk], { strategy: "cheapest" }).total).toBe(2.5);
  });
});

describe("one_store", () => {
  const items = () => [
    concept("mlijeko", [
      offer({ itemId: "m1", chainCode: "konzum", price: 2.0 }),
      offer({ itemId: "m2", chainCode: "lidl", price: 1.5 }),
    ]),
    concept("maslac", [
      offer({ itemId: "b1", chainCode: "konzum", price: 3.0 }),
      offer({ itemId: "b2", chainCode: "spar", price: 2.5 }),
    ]),
  ];

  it("prefers one chain that covers everything over a cheaper split", () => {
    const r = optimizeBasket(items(), { strategy: "one_store" });
    expect(r.groups.map((g) => g.chainCode)).toEqual(["konzum"]);
    expect(r.total).toBe(5);
    expect(r.scattered).toBe(false);
    expect(r.bestSingleChain).toMatchObject({ chainCode: "konzum", missing: [] });
  });

  it("uses the cheapest pair when no single chain covers everything", () => {
    const [milk, butter] = items();
    milk.candidates = milk.candidates.filter((o) => o.chainCode === "lidl");
    const r = optimizeBasket([milk, butter], { strategy: "one_store" });
    expect(r.groups.map((g) => g.chainCode).sort()).toEqual(["lidl", "spar"]);
    expect(r.total).toBe(4);
  });

  it("falls back to cheapest and flags scattered when more than 3 chains are needed", () => {
    const four = ["a", "b", "c", "d"].map((c) => concept(c, [offer({ itemId: c, chainCode: c, price: 1 })]));
    const r = optimizeBasket(four, { strategy: "one_store" });
    expect(r.scattered).toBe(true);
    expect(r.total).toBe(4);
    expect(r.bestSingleChain?.missing).toHaveLength(3);
  });

  it("lists the stores that carry all chosen products", () => {
    const milk = concept("mlijeko", [
      offer({ itemId: "m", chainCode: "konzum", price: 2, isChainwide: false, storeId: "konzum:1", storeAddress: "Ilica 1" }),
      offer({ itemId: "m", chainCode: "konzum", price: 2, isChainwide: false, storeId: "konzum:2", storeAddress: "Savska 2" }),
    ]);
    const tofu = concept("tofu", [
      offer({ itemId: "t", chainCode: "konzum", price: 3, isChainwide: false, storeId: "konzum:2", storeAddress: "Savska 2" }),
    ]);
    const r = optimizeBasket([milk, tofu], { strategy: "one_store" });
    expect(r.groups[0].storesWithAll).toEqual([{ id: "konzum:2", address: "Savska 2" }]);
  });
});

describe("nutrition", () => {
  const item = () =>
    concept("tofu", [
      offer({ itemId: "low", chainCode: "a", price: 1, nutrition: { proteins: 8 } }),
      offer({ itemId: "high", chainCode: "b", price: 3, nutrition: { proteins: 15 } }),
      offer({ itemId: "unknown", chainCode: "c", price: 0.5, nutrition: {} }),
    ]);

  it("sorts descending with unknown values last", () => {
    const r = optimizeBasket([item()], { strategy: "nutrition", metric: "proteins", order: "desc" });
    expect(r.groups[0].lines[0].offer.itemId).toBe("high");
  });

  it("sorts ascending with unknown values still last", () => {
    const r = optimizeBasket([item()], { strategy: "nutrition", metric: "proteins", order: "asc" });
    expect(r.groups[0].lines[0].offer.itemId).toBe("low");
  });

  it("summarises nutrition for the quantity used", () => {
    const r = optimizeBasket([item()], { strategy: "nutrition", metric: "proteins" });
    expect(r.nutritionSummary.proteins).toEqual({ value: 75, complete: true }); // 15 g/100 g × 500 g
    expect(r.nutritionSummary.salt.complete).toBe(false);
  });
});
