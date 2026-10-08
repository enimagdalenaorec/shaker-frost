export const STRATEGIES = ["one_store", "cheapest", "nutrition"] as const;
export type Strategy = (typeof STRATEGIES)[number];

// The EU "big 7" + fibre, per 100 g/ml. Keys match the catalog columns.
export const NUTRITION_METRICS = [
  "energy_kcal",
  "fat",
  "saturated_fat",
  "carbohydrates",
  "sugars",
  "proteins",
  "salt",
  "fiber",
] as const;
export type NutritionMetric = (typeof NUTRITION_METRICS)[number];
export type SortOrder = "asc" | "desc";
export type Unit = "g" | "ml" | "kom";

export type Nutrition = Partial<Record<NutritionMetric, number | null>>;

/** One product at one store (or chain-wide). */
export type Offer = {
  itemId: string;
  name: string;
  brand: string | null;
  chainCode: string;
  chainName: string;
  storeId: string;
  storeAddress: string | null;
  isChainwide: boolean;
  price: number;
  regularPrice: number | null;
  isAkcija: boolean;
  /** Total package content (size × pack count); null = unknown. */
  netQty: number | null;
  unit: Unit | null;
  provjeri: boolean;
  nutrition: Nutrition;
  /** How many of the AI-preferred facets this product matches (concept items only). */
  facetScore?: number;
  /** Display only: drives the category icon / "online" label. */
  conceptGroup?: string | null;
  chainKind?: string;
};

export type BasketItem = {
  id: string;
  kind: "concept" | "product";
  label: string;
  /** concept items: how much the recipe needs */
  requiredQty?: number | null;
  requiredUnit?: Unit | null;
  /** product items: how many packages the user wants */
  packages?: number;
  pinnedItemId?: string | null;
  /** concept: all offers of all products in the concept; product: that product's offers */
  candidates: Offer[];
};

export type Line = {
  item: BasketItem;
  offer: Offer;
  packages: number;
  lineCost: number;
  /** Cost of the quantity actually used ("iskorišteno"); null when the package size is unknown. */
  usedCost: number | null;
  sizeKnown: boolean;
};

export type StoreRef = { id: string; address: string | null };

export type ChainGroup = {
  chainCode: string;
  chainName: string;
  lines: Line[];
  subtotal: number;
  /** "all" = every store of the chain carries everything (chain-wide prices). */
  storesWithAll: "all" | StoreRef[];
};

export type UnpricedReason = "no_offers" | "only_provjeri";

export type OptimizeOptions = {
  strategy: Strategy;
  metric?: NutritionMetric;
  order?: SortOrder;
  maxChains?: number;
};

export type NutritionTotal = { value: number; complete: boolean };

export type OptimizeResult = {
  strategy: Strategy;
  groups: ChainGroup[];
  total: number;
  unpriced: { item: BasketItem; reason: UnpricedReason }[];
  /** one_store only: no ≤ maxChains combination covers everything, so we fell back to cheapest. */
  scattered: boolean;
  /** one_store only: the best single chain and what it is missing. */
  bestSingleChain: { chainCode: string; chainName: string; total: number; missing: string[] } | null;
  /** Most expensive sensible choice minus this total. */
  saving: number;
  nutritionSummary: Record<NutritionMetric, NutritionTotal>;
};
