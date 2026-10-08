// Wire format between /api/basket/optimize and the Košarica page (no candidate lists, just the answer).
import { z } from "zod";
import { NUTRITION_METRICS, STRATEGIES, type NutritionTotal, type Offer, type Strategy, type UnpricedReason } from "./types";

export const BasketItemInput = z.object({
  id: z.string(),
  kind: z.enum(["product", "concept"]),
  label: z.string(),
  itemId: z.string().optional(),
  conceptId: z.string().optional(),
  facets: z.record(z.string(), z.string()).optional(),
  requiredQty: z.number().nullable().optional(),
  requiredUnit: z.enum(["g", "ml", "kom"]).nullable().optional(),
  packages: z.number().int().min(1).default(1),
  pinnedItemId: z.string().nullable().optional(),
});

export const OptimizeRequest = z.object({
  items: z.array(BasketItemInput).max(60),
  strategy: z.enum(STRATEGIES),
  metric: z.enum(NUTRITION_METRICS).default("proteins"),
  order: z.enum(["asc", "desc"]).default("desc"),
  excludeTags: z.array(z.string()).default([]),
});
export type OptimizeRequest = z.input<typeof OptimizeRequest>;

export type LineView = {
  basketItemId: string;
  kind: "product" | "concept";
  label: string;
  offer: Offer;
  packages: number;
  lineCost: number;
  usedCost: number | null;
  sizeKnown: boolean;
  requiredQty: number | null;
  requiredUnit: string | null;
  alternatives: number;
};

export type BasketView = {
  strategy: Strategy;
  groups: {
    chainCode: string;
    chainName: string;
    chainKind: string;
    subtotal: number;
    storesWithAll: "all" | { id: string; address: string | null }[];
    lines: LineView[];
  }[];
  total: number;
  saving: number;
  scattered: boolean;
  bestSingleChain: { chainCode: string; chainName: string; total: number; missing: string[] } | null;
  unpriced: { basketItemId: string; label: string; reason: UnpricedReason }[];
  nutritionSummary: Record<string, NutritionTotal>;
};
