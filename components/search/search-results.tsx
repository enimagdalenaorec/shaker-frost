"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Percent, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductRow } from "@/components/catalog/product-row";
import { Strip } from "@/components/section";
import { EXAMPLE_SEARCHES } from "@/lib/examples";

type Sort = "unit" | "price" | "discount";
const SORTS: { id: Sort; label: string }[] = [
  { id: "unit", label: hr.search.sortUnit },
  { id: "price", label: hr.search.sortPrice },
  { id: "discount", label: hr.search.sortDiscount },
];

const inf = (v: number | null | undefined) => v ?? Number.POSITIVE_INFINITY;

export function SearchResults({ query, results }: { query: string; results: ProductSummary[] }) {
  const [sort, setSort] = useState<Sort>("unit");
  const [onlyAkcija, setOnlyAkcija] = useState(false);

  const deals = useMemo(
    () => results.filter((r) => r.anyAkcija).sort((a, b) => b.maxDiscountPct - a.maxDiscountPct),
    [results],
  );

  const list = useMemo(() => {
    const filtered = onlyAkcija ? results.filter((r) => r.anyAkcija) : results;
    // relevance tier first (so "smjesa za kruh" never beats real bread), then the chosen order
    return [...filtered].sort(
      (a, b) =>
        (a.matchTier ?? 1) - (b.matchTier ?? 1) ||
        (sort === "unit" ? inf(a.unitPrice) - inf(b.unitPrice) || a.price - b.price
          : sort === "price" ? a.price - b.price
          : b.maxDiscountPct - a.maxDiscountPct || a.price - b.price),
    );
  }, [results, sort, onlyAkcija]);

  if (!query) {
    return <Suggestions title="Što tražiš danas?" />;
  }

  if (!results.length) {
    return (
      <div className="mt-14 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-oat-200 text-cocoa-400">
          <SearchX className="size-6" />
        </span>
        <h2 className="mt-4 text-xl text-cocoa-900">{hr.search.empty(query)}</h2>
        <Suggestions title={hr.search.emptyHint} />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[1.65rem] font-normal text-cocoa-900">{hr.search.title(query)}</h1>
        <span className="tabular shrink-0 text-sm text-cocoa-400">{hr.search.count(results.length)}</span>
      </div>

      {deals.length >= 2 && !onlyAkcija && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold text-apricot-700">
            <span className="grid size-5 place-items-center rounded-full bg-apricot-100">
              <Percent className="size-3" />
            </span>
            {hr.search.onAkcija}
          </h2>
          <Strip>
            {deals.map((p) => (
              <ProductCard key={p.itemId} product={p} source="search" />
            ))}
          </Strip>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-sm font-semibold text-cocoa-700">{hr.search.all}</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-oat-200/70 p-0.5" role="radiogroup" aria-label="Poredak">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={sort === s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    sort === s.id ? "bg-card text-cocoa-900 shadow-soft" : "text-cocoa-500 hover:text-cocoa-700",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={onlyAkcija}
              onClick={() => setOnlyAkcija((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                onlyAkcija ? "bg-apricot-500 text-white ring-apricot-500" : "bg-card text-cocoa-500 ring-border hover:text-cocoa-700",
              )}
            >
              {hr.search.onlyAkcija}
            </button>
          </div>
        </div>
        <ul className="space-y-3">
          {list.map((p) => (
            <ProductRow key={p.itemId} product={p} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Suggestions({ title }: { title: string }) {
  const extra = ["tofu", "biljni maslac", "vrhnje za kuhanje", "veganski sir"];
  return (
    <div className="mt-8 text-center">
      <p className="text-sm text-cocoa-500">{title}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {[...EXAMPLE_SEARCHES, ...extra].map((q) => (
          <Link
            key={q}
            href={`/trazi?q=${encodeURIComponent(q)}`}
            className="rounded-full bg-card px-3 py-1.5 text-sm text-cocoa-700 ring-1 ring-border transition-colors hover:bg-mint-50 hover:text-mint-700 hover:ring-mint-200"
          >
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
