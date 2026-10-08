import type { Metadata } from "next";
import { Suspense } from "react";
import { SmartInput } from "@/components/smart-input";
import { SearchResults } from "@/components/search/search-results";
import { ProductRowSkeleton } from "@/components/catalog/product-row";
import { searchProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Pretraga" };

export default function SearchPage({ searchParams }: PageProps<"/trazi">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <Suspense fallback={<SearchSkeleton />}>
        <Search searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Search({ searchParams }: { searchParams: PageProps<"/trazi">["searchParams"] }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const results = q ? await searchProducts(q) : [];
  return (
    <>
      <SmartInput key="search" defaultValue={q} variant="compact" live autoFocus={!q} />
      <SearchResults query={q} results={results} />
    </>
  );
}

function SearchSkeleton() {
  return (
    <>
      <div className="h-12 animate-pulse rounded-[1.4rem] bg-card ring-1 ring-border" />
      <ul className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <ProductRowSkeleton key={i} />
        ))}
      </ul>
    </>
  );
}
