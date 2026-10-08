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
        <p className="font-heading text-3xl font-black text-ink">{hr.search.empty(query)}</p>
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
            "blob inline-flex h-9 shrink-0 items-center gap-1 px-4 text-[13px] font-extrabold text-ink",
            onlyAkcija ? "blob-fill-guava" : "blob-fill-blush hover:blob-fill-guava-light",
          )}
        >
          <Percent className="size-3.5" /> {hr.search.onlyAkcija}
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-ink/15" />
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sort === s.id}
            onClick={() => setSort(s.id)}
            className={cn(
              "blob h-9 shrink-0 px-4 text-[13px] font-extrabold transition-colors",
              sort === s.id ? "blob-fill-ink text-cream" : "blob-fill-oat-200 text-ink hover:blob-fill-pistachio-light",
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="micro ml-auto shrink-0 pl-3 text-rind">{list.length}</span>
      </div>
      <ul className="pebble mt-3 bg-paper p-2 shadow-soft">
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
      <p className="micro text-rind">{hr.search.popular}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {EXAMPLE_SEARCHES.map((q) => (
          <Link
            key={q}
            href={`/trazi?q=${encodeURIComponent(q)}`}
            className="blob blob-fill-oat-200 px-4 py-1.5 text-sm font-extrabold text-ink hover:blob-fill-pistachio-light"
          >
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
