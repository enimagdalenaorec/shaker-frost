"use server";

import { getBestOffers, getStoreOffers } from "@/lib/catalog/queries";

export async function storeOffersAction(itemId: string) {
  return getStoreOffers(itemId);
}

export async function bestOffersAction(itemIds: string[]) {
  return getBestOffers(itemIds.slice(0, 20));
}
