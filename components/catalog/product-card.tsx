"use client";

import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary } from "@/lib/catalog/types";
import type { HistoryEntry } from "@/lib/basket/local-store";
import { AddButton } from "./add-button";
import { ChainBadge } from "./chain-badge";
import { DiscountBadge, PriceTag } from "./price-tag";
import { ProductIcon } from "./product-icon";

/** Grid tile: picture area, name, store, shelf tag + add. */
export function ProductCard({
  product: p,
  source,
  times,
  className,
}: {
  product: ProductSummary;
  source: HistoryEntry["source"];
  times?: number;
  className?: string;
}) {
  return (
    <article className={cn("flex flex-col rounded-[20px] bg-card p-1.5 ring-1 ring-cocoa-900/[0.06]", className)}>
      <div className="relative">
        <ProductIcon group={p.conceptGroup} name={p.name} className="aspect-[5/4] w-full rounded-[15px]" iconClassName="size-8" />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between">
          {p.isAkcija ? <DiscountBadge pct={p.discountPct} /> : <span />}
          {times ? (
            <span className="tabular rounded-full bg-cocoa-900 px-1.5 py-0.5 text-[11px] font-bold leading-none text-oat-50">
              {hr.home.times(times)}
            </span>
          ) : p.eko ? (
            <span className="grid size-5 place-items-center rounded-full bg-oat-50 text-mint-600" title={hr.product.eko}>
              <Leaf className="size-3" />
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-2">
        <h3 className="line-clamp-2 min-h-[2.5em] font-sans text-[13px] font-semibold leading-[1.25] text-cocoa-900">{p.name}</h3>
        <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} className="mt-1" />
        <div className="mt-2.5 flex items-end justify-between gap-1">
          <PriceTag price={p.price} regularPrice={p.regularPrice} isAkcija={p.isAkcija} size="sm" className="items-start" />
          <AddButton product={p} source={source} className="size-8" />
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[20px] bg-card p-1.5 ring-1 ring-cocoa-900/[0.06]">
      <div className="aspect-[5/4] w-full animate-pulse rounded-[15px] bg-oat-200" />
      <div className="mx-1.5 mt-2.5 h-3 w-4/5 animate-pulse rounded bg-oat-200" />
      <div className="mx-1.5 mt-2 h-3 w-1/2 animate-pulse rounded bg-oat-200" />
      <div className="mx-1.5 mb-1 mt-3 h-6 w-1/3 animate-pulse rounded bg-oat-200" />
    </div>
  );
}

/** Responsive grid for tiles. */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">{children}</div>;
}
