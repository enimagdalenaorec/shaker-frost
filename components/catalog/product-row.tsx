"use client";

import { AlertCircle, ChevronDown, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { formatDate, formatPrice, formatSize, nameHasSize } from "@/lib/format";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary, StoreOffer } from "@/lib/catalog/types";
import { storeOffersAction } from "@/app/actions/catalog";
import { AddButton } from "./add-button";
import { ChainBadge } from "./chain-badge";
import { DiscountBadge, PriceTag } from "./price-tag";
import { ProductIcon } from "./product-icon";

/** Full-width search result: cheapest offer up front, every store price one tap away. */
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
    <li className="rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/70 sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        <ProductIcon group={p.conceptGroup} name={p.name} className="size-14 sm:size-16" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-sans text-[15px] font-medium leading-snug text-cocoa-900">{p.name}</h3>
              <p className="mt-0.5 text-xs text-cocoa-400">
                {[p.brand, nameHasSize(p.name, formatSize(p.sizeValue, p.sizeUnit, p.packCount)) ? null : formatSize(p.sizeValue, p.sizeUnit, p.packCount)]
                  .filter(Boolean)
                  .join(" · ")}
                {p.eko && <span className="ml-1.5 rounded-full bg-mint-50 px-1.5 py-px text-[10px] font-medium text-mint-700">{hr.product.eko}</span>}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {p.isAkcija && <DiscountBadge pct={p.discountPct} />}
              <PriceTag price={p.price} regularPrice={p.regularPrice} isAkcija={p.isAkcija} unitPrice={p.unitPrice} unit={p.sizeUnit} align="right" />
            </div>
          </div>

          {p.provjeri && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-honey-100 px-2 py-0.5 text-[11px] font-medium text-honey-700">
              <AlertCircle className="size-3" /> {hr.search.provjeri}
            </p>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="-ml-1.5 inline-flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-xs text-cocoa-500 transition-colors hover:bg-oat-200/60"
            >
              <span className="hidden text-cocoa-400 sm:inline">{hr.search.cheapestAt}</span>
              <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} />
              {more > 0 && <span className="whitespace-nowrap text-cocoa-400">{hr.search.moreStores(more)}</span>}
              <ChevronDown className={cn("size-3.5 text-cocoa-400 transition-transform", open && "rotate-180")} />
            </button>
            <AddButton product={p} source="search" variant="pill" />
          </div>

          {open && (
            <div className="mt-3 rounded-xl bg-oat-100/70 p-2.5 ring-1 ring-border/50">
              {pending || !offers ? (
                <div className="space-y-2 py-1">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-4 animate-pulse rounded bg-oat-200" />
                  ))}
                </div>
              ) : (
                <StoreOfferList offers={offers} productUrl={p.productUrl} />
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function StoreOfferList({ offers, productUrl }: { offers: StoreOffer[]; productUrl: string | null }) {
  // One line per chain; store-level rows of the same chain collapse into "N trgovina".
  const byChain = new Map<string, StoreOffer[]>();
  for (const o of offers) byChain.set(o.chainCode, [...(byChain.get(o.chainCode) ?? []), o]);
  const chains = [...byChain.values()].sort((a, b) => a[0].price - b[0].price);
  const date = formatDate(offers[0]?.priceDate);

  return (
    <div>
      <ul className="divide-y divide-border/60">
        {chains.map((group) => {
          const o = group[0];
          const where = o.chainKind === "webshop"
            ? hr.product.online
            : o.isChainwide
              ? hr.product.chainwide
              : group.map((g) => g.storeAddress).filter(Boolean).join(", ");
          return (
            <li key={o.chainCode} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <ChainBadge code={o.chainCode} name={o.chainName} kind={o.chainKind} />
                <p className="truncate pl-3.5 text-[11px] text-cocoa-400">{where}</p>
              </div>
              <div className="flex items-center gap-2">
                {o.isAkcija && <DiscountBadge pct={o.discountPct} />}
                <span className={cn("tabular text-sm font-semibold", o.isAkcija ? "text-apricot-700" : "text-cocoa-900")}>
                  {formatPrice(o.price)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-cocoa-400">
        {date && <span>{hr.product.lastPrice}: {date}</span>}
        {productUrl && (
          <a href={productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-mint-700">
            web trgovina <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function ProductRowSkeleton() {
  return (
    <li className="flex gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/70 sm:p-4">
      <div className="size-14 animate-pulse rounded-xl bg-oat-200 sm:size-16" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 w-3/5 animate-pulse rounded bg-oat-200" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-oat-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-oat-200" />
      </div>
    </li>
  );
}
