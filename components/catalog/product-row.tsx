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
import { ProductIcon } from "./product-icon";

/** Compact search result. Tap the store line to see every store's price. */
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
    <li className="rounded-[20px] bg-card p-1.5 ring-1 ring-cocoa-900/[0.06]">
      <div className="flex items-center gap-3 pr-1.5">
        <div className="relative">
          <ProductIcon group={p.conceptGroup} name={p.name} className="size-[4.5rem] rounded-[15px]" iconClassName="size-7" />
          {p.isAkcija && <DiscountBadge pct={p.discountPct} className="absolute -left-1 -top-1" />}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className="line-clamp-2 font-sans text-[14px] font-semibold leading-[1.25] text-cocoa-900">{p.name}</h3>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full py-0.5 text-xs"
          >
            <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} />
            {more > 0 && (
              <span className="tabular rounded-full bg-oat-200 px-1.5 py-px text-[10px] font-bold text-cocoa-500">
                {hr.search.moreStores(more)}
              </span>
            )}
            <ChevronDown className={cn("size-3.5 text-cocoa-400 transition-transform", open && "rotate-180")} />
          </button>
          {p.provjeri && <p className="mt-1 text-[11px] font-semibold text-honey-700">{hr.search.provjeri}</p>}
        </div>
        <PriceTag price={p.price} regularPrice={p.regularPrice} isAkcija={p.isAkcija} unitPrice={p.unitPrice} unit={p.sizeUnit} />
        <AddButton product={p} source="search" />
      </div>

      {open && (
        <div className="mx-1.5 mb-1.5 mt-2 rounded-2xl bg-oat-100 p-3">
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
  // One line per chain; store-level rows of the same chain collapse into one.
  const byChain = new Map<string, StoreOffer[]>();
  for (const o of offers) byChain.set(o.chainCode, [...(byChain.get(o.chainCode) ?? []), o]);
  const chains = [...byChain.values()].sort((a, b) => a[0].price - b[0].price);
  const date = formatDate(offers[0]?.priceDate);

  return (
    <>
      <ul className="space-y-2">
        {chains.map((group) => {
          const o = group[0];
          const where =
            o.chainKind === "webshop" ? hr.product.online
            : o.isChainwide ? hr.product.chainwide
            : group.map((g) => g.storeAddress).filter(Boolean).join(", ");
          return (
            <li key={o.chainCode} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <ChainBadge code={o.chainCode} name={o.chainName} kind={o.chainKind} />
                <p className="truncate pl-3.5 text-[11px] text-cocoa-400">{where}</p>
              </div>
              <span className={cn("tabular text-sm font-bold", o.isAkcija ? "text-apricot-700" : "text-cocoa-900")}>
                {formatPrice(o.price)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2.5 flex items-center justify-between border-t border-cocoa-900/5 pt-2 text-[11px] text-cocoa-400">
        {date && <span>{hr.product.lastPrice} {date}</span>}
        {productUrl && (
          <a href={productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-mint-700">
            web <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </>
  );
}

export function ProductRowSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-[20px] bg-card p-1.5 ring-1 ring-cocoa-900/[0.06]">
      <div className="size-[4.5rem] animate-pulse rounded-[15px] bg-oat-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/5 animate-pulse rounded bg-oat-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-oat-200" />
      </div>
    </li>
  );
}
