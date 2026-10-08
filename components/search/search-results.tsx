"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary } from "@/lib/catalog/types";
import { ProductRow } from "@/components/catalog/product-row";
import { EXAMPLE_SEARCHES } from "@/lib/examples";

type Sort = "recommended" | "unit" | "price";
const SORTS: { id: Sort; label: string }[] = [
  { id: "recommended", label: hr.search.sortRecommended },
  { id: "unit", label: hr.search.sortUnit },
  { id: "price", label: hr.search.sortPrice },
];

const inf = (v: number | null | undefined) => v ?? Number.POSITIVE_INFINITY;

export function SearchResults({
  query,
  results,
  initialOnlyAkcija = false,
}: {
  query: string;
  results: ProductSummary[];
  initialOnlyAkcija?: boolean;
}) {
  const [sort, setSort] = useState<Sort>("recommended");
  const [onlyAkcija, setOnlyAkcija] = useState(initialOnlyAkcija);

  const list = useMemo(() => {
    const filtered = onlyAkcija ? results.filter((r) => r.anyAkcija) : results;
    // relevance tier first, so "smjesa za kruh" never beats real bread
    return [...filtered].sort(
      (a, b) =>
        (a.matchTier ?? 1) - (b.matchTier ?? 1) ||
        (sort === "recommended" ? Number(b.anyAkcija) - Number(a.anyAkcija) || inf(a.unitPrice) - inf(b.unitPrice)
          : sort === "unit" ? inf(a.unitPrice) - inf(b.unitPrice) || a.price - b.price
          : a.price - b.price),
    );
  }, [results, sort, onlyAkcija]);

  if (!query && !initialOnlyAkcija) return <Popular />;

  if (!results.length) {
    return (
      <div className="mt-12 text-center">
        <p className="font-heading text-2xl font-bold text-cocoa-900">{hr.search.empty(query)}</p>
        <Popular />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
        <button
          type="button"
          aria-pressed={onlyAkcija}
          onClick={() => setOnlyAkcija((v) => !v)}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold transition-colors",
            onlyAkcija ? "bg-apricot-500 text-white" : "bg-apricot-100 text-apricot-700",
          )}
        >
          <Percent className="size-3.5" /> {hr.search.onlyAkcija}
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-cocoa-900/10" />
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sort === s.id}
            onClick={() => setSort(s.id)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors",
              sort === s.id ? "bg-cocoa-900 text-oat-50" : "text-cocoa-500 hover:bg-oat-200",
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="tabular ml-auto shrink-0 pl-3 text-xs font-medium text-cocoa-400">{list.length}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {list.map((p) => (
          <ProductRow key={p.itemId} product={p} />
        ))}
      </ul>
    </div>
  );
}

function Popular() {
  return (
    <div className="mt-6">
      <p className="text-xs font-bold uppercase tracking-wider text-cocoa-400">{hr.search.popular}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {EXAMPLE_SEARCHES.map((q) => (
          <Link
            key={q}
            href={`/trazi?q=${encodeURIComponent(q)}`}
            className="rounded-full bg-oat-50 px-3.5 py-2 text-sm font-medium text-cocoa-700 ring-1 ring-cocoa-900/[0.08] transition-colors hover:bg-mint-50 hover:text-mint-700"
          >
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
