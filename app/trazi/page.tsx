import type { Metadata } from "next";
import { Suspense } from "react";
import { SmartInput } from "@/components/smart-input";
import { SearchResults } from "@/components/search/search-results";
import { ProductRowSkeleton } from "@/components/catalog/product-row";
import { searchProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Traži" };

export default function SearchPage({ searchParams }: PageProps<"/trazi">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6 sm:pt-6">
      <Suspense fallback={<SearchSkeleton />}>
        <Search searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Search({ searchParams }: { searchParams: PageProps<"/trazi">["searchParams"] }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const onlyAkcija = params.akcija === "1";
  const results = q || onlyAkcija ? await searchProducts(q, onlyAkcija) : [];
  return (
    <>
      <SmartInput key="search" defaultValue={q} variant="compact" live autoFocus={!q && !onlyAkcija} />
      <SearchResults query={q} results={results} initialOnlyAkcija={onlyAkcija} />
    </>
  );
}

function SearchSkeleton() {
  return (
    <>
      <div className="h-14 animate-pulse rounded-full border-2 border-ink/20 bg-paper" />
      <ul className="mt-5 rounded-[24px] border-[1.5px] border-ink/20 bg-paper p-2">
        {[0, 1, 2].map((i) => (
          <ProductRowSkeleton key={i} />
        ))}
      </ul>
    </>
  );
}
