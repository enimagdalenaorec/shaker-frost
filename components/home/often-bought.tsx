"use client";

import { useEffect, useState } from "react";
import { bestOffersAction } from "@/app/actions/catalog";
import { ProductCard, ProductCardSkeleton } from "@/components/catalog/product-card";
import { Section, Strip } from "@/components/section";
import { oftenBought, useBasketState } from "@/lib/basket/local-store";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary } from "@/lib/catalog/types";

/** "Često kupuješ": renders nothing until the user has added something. */
export function OftenBought() {
  const { history } = useBasketState();
  const often = oftenBought(history).filter((o) => o.entry.kind === "product" && o.entry.itemId);
  const key = often.map((o) => o.entry.itemId!).join("|");
  const [products, setProducts] = useState<Record<string, ProductSummary> | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    bestOffersAction(key.split("|")).then((rows) => {
      if (!cancelled) setProducts(Object.fromEntries(rows.map((r) => [r.itemId, r])));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!often.length) return null;

  return (
    <Section title={hr.home.often}>
      <Strip>
        {often.map((o) => {
          const p = products?.[o.entry.itemId!];
          return (
            <div key={o.key} className="w-[10.5rem] shrink-0 snap-start">
              {!products ? <ProductCardSkeleton /> : p ? <ProductCard product={p} source="often" times={o.times} /> : null}
            </div>
          );
        })}
      </Strip>
    </Section>
  );
}
