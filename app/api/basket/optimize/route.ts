import { optimizeBasket } from "@/lib/basket/optimize";
import { OptimizeRequest, type BasketView } from "@/lib/basket/view";
import { loadBasketItems } from "@/lib/catalog/basket-candidates";

export async function POST(request: Request) {
  const parsed = OptimizeRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Neispravan zahtjev", issues: parsed.error.issues }, { status: 400 });
  }
  const { items, strategy, metric, order, excludeTags } = parsed.data;

  const basketItems = await loadBasketItems(items, excludeTags);
  const inputById = new Map(items.map((i) => [i.id, i]));
  const result = optimizeBasket(basketItems, { strategy, metric, order });

  const view: BasketView = {
    strategy: result.strategy,
    total: result.total,
    saving: result.saving,
    scattered: result.scattered,
    bestSingleChain: result.bestSingleChain,
    nutritionSummary: result.nutritionSummary,
    unpriced: result.unpriced.map((u) => ({ basketItemId: u.item.id, label: u.item.label, reason: u.reason })),
    groups: result.groups.map((g) => ({
      chainCode: g.chainCode,
      chainName: g.chainName,
      chainKind: g.lines[0]?.offer.chainKind ?? "store",
      subtotal: g.subtotal,
      storesWithAll: g.storesWithAll,
      lines: g.lines.map((l) => ({
        basketItemId: l.item.id,
        kind: l.item.kind,
        label: l.item.label,
        forIngredient: inputById.get(l.item.id)?.forIngredient ?? null,
        offer: l.offer,
        packages: l.packages,
        lineCost: l.lineCost,
        usedCost: l.usedCost,
        sizeKnown: l.sizeKnown,
        requiredQty: l.item.requiredQty ?? null,
        requiredUnit: l.item.requiredUnit ?? null,
        alternatives: new Set(l.item.candidates.map((c) => c.itemId)).size,
      })),
    })),
  };
  return Response.json(view);
}
