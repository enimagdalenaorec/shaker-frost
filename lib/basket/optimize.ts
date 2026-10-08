import {
  NUTRITION_METRICS,
  type BasketItem,
  type ChainGroup,
  type Line,
  type NutritionMetric,
  type NutritionTotal,
  type Offer,
  type OptimizeOptions,
  type OptimizeResult,
  type SortOrder,
  type StoreRef,
  type UnpricedReason,
} from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

const sameDimension = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && (a === b || (a !== "kom" && b !== "kom")); // ml ≈ g

/** Packages needed and cost of one offer for one item. Unknown size → 1 package, flagged. */
export function costOf(item: BasketItem, offer: Offer): Omit<Line, "item" | "offer"> {
  if (item.kind === "product") {
    const packages = Math.max(1, item.packages ?? 1);
    return { packages, lineCost: round2(packages * offer.price), usedCost: round2(packages * offer.price), sizeKnown: true };
  }
  const need = item.requiredQty ?? null;
  const size = offer.netQty;
  if (need == null || need <= 0 || size == null || size <= 0 || !sameDimension(item.requiredUnit, offer.unit)) {
    return { packages: 1, lineCost: round2(offer.price), usedCost: null, sizeKnown: false };
  }
  const packages = Math.max(1, Math.ceil(need / size - 1e-9));
  return {
    packages,
    lineCost: round2(packages * offer.price),
    usedCost: round2((need / size) * offer.price),
    sizeKnown: true,
  };
}

/**
 * Offers allowed for an item: not "provjeri", the pin respected, and (when `strictFacets`) for concept
 * items only the best facet-matching tier: the AI's facet choice for the dish beats a cheaper but wrong
 * product. "one_store" passes strictFacets=false and treats facets as a preference inside each store,
 * because fewer shop visits is what the user asked for.
 */
export function eligibleOffers(item: BasketItem, strictFacets = true): Offer[] {
  let offers = item.candidates.filter((o) => !o.provjeri);
  if (item.pinnedItemId) offers = offers.filter((o) => o.itemId === item.pinnedItemId);
  if (strictFacets && item.kind === "concept" && offers.length) {
    const best = Math.max(...offers.map((o) => o.facetScore ?? 0));
    offers = offers.filter((o) => (o.facetScore ?? 0) === best);
  }
  return offers;
}

/** Best facet match first, then cheapest: how one_store picks within the chosen shops. */
const byFacetThenCost = (item: BasketItem) => (a: Offer, b: Offer) =>
  (b.facetScore ?? 0) - (a.facetScore ?? 0) || byCost(item)(a, b);

const byCost = (item: BasketItem) => (a: Offer, b: Offer) =>
  costOf(item, a).lineCost - costOf(item, b).lineCost ||
  unitPrice(a) - unitPrice(b) ||
  a.itemId.localeCompare(b.itemId);

function unitPrice(o: Offer): number {
  return o.netQty && o.netQty > 0 ? o.price / o.netQty : Number.POSITIVE_INFINITY;
}

function byMetric(item: BasketItem, metric: NutritionMetric, order: SortOrder) {
  return (a: Offer, b: Offer) => {
    const va = a.nutrition[metric];
    const vb = b.nutrition[metric];
    const ka = va == null;
    const kb = vb == null;
    if (ka !== kb) return ka ? 1 : -1; // unknown always last
    if (!ka && !kb && va !== vb) return order === "asc" ? va! - vb! : vb! - va!;
    return byCost(item)(a, b);
  };
}

function cheapestIn(item: BasketItem, offers: Offer[]): Offer | undefined {
  return offers.length ? [...offers].sort(byCost(item))[0] : undefined;
}

function* subsets<T>(arr: T[], size: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === size) {
    yield acc;
    return;
  }
  for (let i = start; i <= arr.length - (size - acc.length); i++) {
    yield* subsets(arr, size, i + 1, [...acc, arr[i]]);
  }
}

export function optimizeBasket(items: BasketItem[], opts: OptimizeOptions): OptimizeResult {
  const { strategy, metric = "proteins", order = "desc", maxChains = 3 } = opts;

  const unpriced: { item: BasketItem; reason: UnpricedReason }[] = [];
  const priced: { item: BasketItem; offers: Offer[] }[] = [];
  for (const item of items) {
    const offers = eligibleOffers(item, strategy !== "one_store");
    if (offers.length) priced.push({ item, offers });
    else unpriced.push({ item, reason: item.candidates.length ? "only_provjeri" : "no_offers" });
  }

  let choice = new Map<string, Offer>();
  let scattered = false;
  let bestSingleChain: OptimizeResult["bestSingleChain"] = null;

  const chooseCheapest = () => {
    const m = new Map<string, Offer>();
    for (const { item, offers } of priced) m.set(item.id, cheapestIn(item, offers)!);
    return m;
  };

  if (strategy === "cheapest") {
    choice = chooseCheapest();
  } else if (strategy === "nutrition") {
    for (const { item, offers } of priced) choice.set(item.id, [...offers].sort(byMetric(item, metric, order))[0]);
  } else {
    // one_store: exact search over all chain subsets of size 1..maxChains.
    const chainNames = new Map<string, string>();
    const bestByChain = new Map<string, Map<string, Offer>>(); // item.id → chain → cheapest offer there
    for (const { item, offers } of priced) {
      const perChain = new Map<string, Offer>();
      for (const chain of new Set(offers.map((o) => o.chainCode))) {
        perChain.set(chain, [...offers.filter((o) => o.chainCode === chain)].sort(byFacetThenCost(item))[0]);
      }
      offers.forEach((o) => chainNames.set(o.chainCode, o.chainName));
      bestByChain.set(item.id, perChain);
    }
    const chains = [...chainNames.keys()].sort();

    const evaluate = (subset: string[]) => {
      let total = 0;
      const picks = new Map<string, Offer>();
      const missing: string[] = [];
      for (const { item } of priced) {
        const perChain = bestByChain.get(item.id)!;
        let best: Offer | undefined;
        for (const c of subset) {
          const o = perChain.get(c);
          if (o && (!best || byFacetThenCost(item)(o, best) < 0)) best = o;
        }
        if (best) {
          picks.set(item.id, best);
          total += costOf(item, best).lineCost;
        } else missing.push(item.label);
      }
      return { picks, total: round2(total), missing };
    };

    let found: { picks: Map<string, Offer>; total: number } | null = null;
    for (let size = 1; size <= Math.min(maxChains, chains.length) && !found; size++) {
      for (const subset of subsets(chains, size)) {
        const r = evaluate(subset);
        // a chain in the subset that ends up unused means a smaller subset already won
        const used = new Set([...r.picks.values()].map((o) => o.chainCode));
        if (r.missing.length || used.size < size) continue;
        if (!found || r.total < found.total) found = r;
      }
    }

    for (const c of chains) {
      const r = evaluate([c]);
      const candidate = { chainCode: c, chainName: chainNames.get(c)!, total: r.total, missing: r.missing };
      if (
        !bestSingleChain ||
        candidate.missing.length < bestSingleChain.missing.length ||
        (candidate.missing.length === bestSingleChain.missing.length && candidate.total < bestSingleChain.total)
      ) {
        bestSingleChain = candidate;
      }
    }

    if (found) choice = found.picks;
    else {
      scattered = priced.length > 0;
      choice = chooseCheapest();
    }
  }

  // Build groups.
  const lines: Line[] = priced.map(({ item }) => {
    const offer = choice.get(item.id)!;
    return { item, offer, ...costOf(item, offer) };
  });
  const groupsMap = new Map<string, Line[]>();
  for (const l of lines) groupsMap.set(l.offer.chainCode, [...(groupsMap.get(l.offer.chainCode) ?? []), l]);
  const groups: ChainGroup[] = [...groupsMap.entries()]
    .map(([chainCode, ls]) => ({
      chainCode,
      chainName: ls[0].offer.chainName,
      lines: ls,
      subtotal: round2(ls.reduce((s, l) => s + l.lineCost, 0)),
      storesWithAll: storesCarryingAll(ls),
    }))
    .sort((a, b) => b.lines.length - a.lines.length || a.subtotal - b.subtotal);

  const total = round2(lines.reduce((s, l) => s + l.lineCost, 0));
  const maxTotal = priced.reduce((s, { item, offers }) => s + Math.max(...offers.map((o) => costOf(item, o).lineCost)), 0);

  return {
    strategy,
    groups,
    total,
    unpriced,
    scattered,
    bestSingleChain: strategy === "one_store" ? bestSingleChain : null,
    saving: round2(Math.max(0, maxTotal - total)),
    nutritionSummary: summarizeNutrition(lines),
  };
}

/** Stores of the chain that carry every chosen product (chain-wide offers count as every store). */
function storesCarryingAll(lines: Line[]): "all" | StoreRef[] {
  const perProduct: Map<string, StoreRef>[] = [];
  for (const l of lines) {
    const sameProduct = l.item.candidates.filter((o) => o.itemId === l.offer.itemId && o.chainCode === l.offer.chainCode);
    if (sameProduct.some((o) => o.isChainwide)) continue; // available everywhere in this chain
    perProduct.push(new Map(sameProduct.map((o) => [o.storeId, { id: o.storeId, address: o.storeAddress }])));
  }
  if (!perProduct.length) return "all";
  return [...perProduct[0].values()].filter((s) => perProduct.every((m) => m.has(s.id)));
}

/** Basket totals of the 8 nutrition values for the quantities actually used. */
function summarizeNutrition(lines: Line[]): Record<NutritionMetric, NutritionTotal> {
  const out = {} as Record<NutritionMetric, NutritionTotal>;
  for (const m of NUTRITION_METRICS) {
    let value = 0;
    let complete = true;
    for (const l of lines) {
      const per100 = l.offer.nutrition[m];
      const grams =
        l.item.kind === "product" ? (l.offer.netQty ?? null) && l.offer.netQty! * l.packages : (l.item.requiredQty ?? null);
      if (per100 == null || grams == null) {
        complete = false;
        continue;
      }
      value += (per100 * grams) / 100;
    }
    out[m] = { value: round2(value), complete };
  }
  return out;
}
