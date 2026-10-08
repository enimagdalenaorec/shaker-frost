"use client";

import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary } from "@/lib/catalog/types";
import type { HistoryEntry } from "@/lib/basket/local-store";
import { AddButton } from "./add-button";
import { ChainBadge } from "./chain-badge";
import { DiscountBadge, PriceTag } from "./price-tag";

/** Short category label shown in mono caps instead of a product photo. */
export function categoryLabel(group: string | null, name: string): string {
  if (/kruh|pecivo|baget/i.test(name)) return "pekarnica";
  switch (group) {
    case "biljne alternative mlijeku": return "biljno mlijeko";
    case "biljne alternative mesu": return "biljno meso";
    case "zamjene za jaja i vezivo": return "zamjena za jaja";
    case "ulja": return "ulja";
    case "brašno, žitarice i tjestenina": return "tjestenina";
    case "ostale biljne zamjene": return "biljna zamjena";
    default: return "namirnica";
  }
}

/** Product tile without a picture (team style): store, category, name, price, add. */
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
        "pebble flex h-full flex-col bg-paper p-3.5 shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} />
        {p.isAkcija ? (
          <DiscountBadge pct={p.discountPct} />
        ) : times ? (
          <span className="blob blob-fill-ink tabular px-2.5 py-0.5 text-[11px] font-black text-cream">{hr.home.times(times)}</span>
        ) : p.eko ? (
          <span className="blob blob-round blob-fill-pistachio grid size-6 place-items-center" title={hr.product.eko}>
            <Leaf className="size-3" />
          </span>
        ) : null}
      </div>
      <p className="micro mt-3 text-rind">{categoryLabel(p.conceptGroup, p.name)}</p>
      <h3 className="mt-1 line-clamp-2 min-h-[2.5em] font-sans text-[15px] font-extrabold leading-[1.25] text-ink">{p.name}</h3>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <PriceTag price={p.price} regularPrice={p.regularPrice} isAkcija={p.isAkcija} className="items-start" />
        <AddButton product={p} source={source} className="size-9" />
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="pebble h-full bg-paper/70 p-3.5">
      <div className="h-[22px] w-12 animate-pulse rounded-md bg-oat-200" />
      <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-oat-200" />
      <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-oat-200" />
      <div className="mt-6 h-6 w-1/3 animate-pulse rounded bg-oat-200" />
    </div>
  );
}

/** Responsive grid for tiles. */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">{children}</div>;
}
