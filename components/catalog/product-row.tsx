"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { formatDate, formatPrice } from "@/lib/format";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary, StoreOffer } from "@/lib/catalog/types";
import { storeOffersAction } from "@/app/actions/catalog";
import { AddButton } from "./add-button";
import { ChainBadge } from "./chain-badge";
import { DiscountBadge, PriceTag } from "./price-tag";
import { categoryLabel } from "./product-card";

/** Search result row (team "price list" style). Tap the store line for every store's price. */
export function ProductRow({ product: p }: { product: ProductSummary }) {
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState<StoreOffer[] | null>(null);
  const [pending, startTransition] = useTransition();
  const more = p.nChains - 1;

  const toggle = () => {
    setOpen((o) => !o);
    if (!offers) startTransition(async () => setOffers(await storeOffersAction(p.itemId)));
  };

  return (
    <li className={cn("pebble-sm px-3 py-3", p.isAkcija ? "bg-blush/60" : "odd:bg-cream")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="micro text-rind">{categoryLabel(p.conceptGroup, p.name)}</p>
            {p.isAkcija && <DiscountBadge pct={p.discountPct} />}
          </div>
          <h3 className="mt-0.5 line-clamp-2 font-sans text-[15px] font-extrabold leading-[1.25] text-ink">{p.name}</h3>
          <button type="button" onClick={toggle} aria-expanded={open} className="mt-1.5 inline-flex items-center gap-1.5">
            <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} />
            {more > 0 && (
              <span className="blob blob-fill-oat-200 tabular px-2 py-0.5 text-[10px] font-black text-ink">{hr.search.moreStores(more)}</span>
            )}
            <ChevronDown className={cn("size-3.5 text-rind transition-transform", open && "rotate-180")} />
          </button>
          {p.provjeri && <p className="mt-1 text-[12px] font-extrabold text-honey-700">{hr.search.provjeri}</p>}
        </div>
        <PriceTag price={p.price} regularPrice={p.regularPrice} isAkcija={p.isAkcija} unitPrice={p.unitPrice} unit={p.sizeUnit} />
        <AddButton product={p} source="search" />
      </div>

      {open && (
        <div className="pebble-sm mt-3 bg-oat-200/50 p-3">
          {pending || !offers ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-oat-200" />
              ))}
            </div>
          ) : (
            <StoreOfferList offers={offers} productUrl={p.productUrl} />
          )}
        </div>
      )}
    </li>
  );
}

function StoreOfferList({ offers, productUrl }: { offers: StoreOffer[]; productUrl: string | null }) {
  const byChain = new Map<string, StoreOffer[]>();
  for (const o of offers) byChain.set(o.chainCode, [...(byChain.get(o.chainCode) ?? []), o]);
  const chains = [...byChain.values()].sort((a, b) => a[0].price - b[0].price);
  const date = formatDate(offers[0]?.priceDate);

  return (
    <>
      <ul className="space-y-2">
        {chains.map((group, n) => {
          const o = group[0];
          const where =
            o.chainKind === "webshop" ? hr.product.online
            : o.isChainwide ? hr.product.chainwide
            : group.map((g) => g.storeAddress).filter(Boolean).join(", ");
          return (
            <li key={o.chainCode} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <ChainBadge code={o.chainCode} name={o.chainName} kind={o.chainKind} />
                <span className="truncate text-xs text-rind">{where}</span>
              </div>
              <span className="flex items-center gap-2">
                {n === 0 && chains.length > 1 && <em className="micro blob blob-fill-rind px-2.5 py-0.5 not-italic text-cream">najjeftinije</em>}
                <span className={cn("tabular font-heading text-base font-black", o.isAkcija ? "text-guava-deep" : "text-ink")}>{formatPrice(o.price)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2.5 flex items-center justify-between border-t border-ink/10 pt-2 text-[11px] font-semibold text-rind">
        {date && <span>{hr.product.lastPrice} {date}</span>}
        {productUrl && (
          <a href={productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
            web <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </>
  );
}

export function ProductRowSkeleton() {
  return (
    <li className="pebble-sm bg-cream px-3 py-3">
      <div className="h-3 w-1/4 animate-pulse rounded bg-oat-200" />
      <div className="mt-2 h-4 w-3/5 animate-pulse rounded bg-oat-200" />
      <div className="mt-2 h-5 w-14 animate-pulse rounded bg-oat-200" />
    </li>
  );
}
