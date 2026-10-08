"use client";

import { cn } from "@/lib/utils";
import { formatSize, nameHasSize } from "@/lib/format";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary } from "@/lib/catalog/types";
import type { HistoryEntry } from "@/lib/basket/local-store";
import { AddButton } from "./add-button";
import { ChainBadge } from "./chain-badge";
import { DiscountBadge, PriceTag } from "./price-tag";
import { ProductIcon } from "./product-icon";

/** Compact vertical card for horizontal strips (deals, often bought). */
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
    <article
      className={cn(
        "flex w-[11.5rem] shrink-0 snap-start flex-col rounded-2xl bg-card p-2.5 shadow-soft ring-1 ring-border/70 transition-shadow hover:shadow-lift",
        className,
      )}
    >
      <div className="relative">
        <ProductIcon group={p.conceptGroup} name={p.name} className="aspect-[4/3] w-full" iconClassName="size-9" />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between">
          {p.isAkcija ? <DiscountBadge pct={p.discountPct} /> : <span />}
          {times ? (
            <span className="tabular rounded-full bg-oat-50/90 px-2 py-0.5 text-[11px] font-semibold text-mint-700 ring-1 ring-mint-200">
              {hr.home.times(times)}
            </span>
          ) : p.eko ? (
            <span className="rounded-full bg-oat-50/90 px-2 py-0.5 text-[11px] font-medium text-mint-700 ring-1 ring-mint-200">
              {hr.product.eko}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-2.5">
        <h3 className="line-clamp-2 font-sans text-[13px] font-medium leading-snug text-cocoa-900">{p.name}</h3>
        {!nameHasSize(p.name, formatSize(p.sizeValue, p.sizeUnit, p.packCount)) && (
          <p className="mt-0.5 text-[11px] text-cocoa-400">{formatSize(p.sizeValue, p.sizeUnit, p.packCount)}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0 space-y-1">
            <PriceTag price={p.price} regularPrice={p.regularPrice} isAkcija={p.isAkcija} size="sm" />
            <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} />
          </div>
          <AddButton product={p} source={source} />
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="w-[11.5rem] shrink-0 rounded-2xl bg-card p-2.5 ring-1 ring-border/70">
      <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-oat-200" />
      <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-oat-200" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-oat-200" />
      <div className="mt-6 h-4 w-1/3 animate-pulse rounded bg-oat-200" />
    </div>
  );
}
