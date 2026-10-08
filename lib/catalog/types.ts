// UI-level catalog types (safe to import from client components).

export type ProductSummary = {
  itemId: string;
  name: string;
  brand: string | null;
  conceptId: string | null;
  conceptGroup: string | null;
  netQty: number | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  packCount: number;
  eko: boolean;
  provjeri: boolean;
  tags: string[];
  productUrl: string | null;
  // cheapest current offer
  chainCode: string;
  chainName: string;
  chainKind: string;
  price: number;
  regularPrice: number | null;
  isAkcija: boolean;
  discountPct: number;
  unitPrice: number | null;
  nChains: number;
  nStores: number;
  anyAkcija: boolean;
  maxDiscountPct: number;
  matchTier?: number;
};

export type StoreOffer = {
  chainCode: string;
  chainName: string;
  chainKind: string;
  storeId: string;
  storeAddress: string | null;
  isChainwide: boolean;
  price: number;
  regularPrice: number | null;
  isAkcija: boolean;
  discountPct: number;
  priceDate: string | null;
};
