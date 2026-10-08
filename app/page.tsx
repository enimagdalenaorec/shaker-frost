import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { SmartInput } from "@/components/smart-input";
import { LeafArt } from "@/components/brand/leaf-art";
import { OftenBought } from "@/components/home/often-bought";
import { ProductCard, ProductCardSkeleton, ProductGrid } from "@/components/catalog/product-card";
import { Section } from "@/components/section";
import { getTodaysDeals } from "@/lib/catalog/queries";
import { EXAMPLE_RECIPES } from "@/lib/examples";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-1 sm:px-6 sm:pt-4">
      <section className="relative overflow-hidden rounded-[28px] bg-mint-700 px-4 pb-4 pt-8 sm:px-8 sm:pb-8 sm:pt-14">
        <LeafArt className="pointer-events-none absolute -right-8 -top-10 size-56 text-mint-500/50 sm:right-6 sm:size-72" />
        <h1 className="relative max-w-[9ch] px-1 text-[2.6rem] font-bold leading-[0.95] text-oat-50 sm:max-w-none sm:text-6xl">
          {hr.home.title}
        </h1>
        <SmartInput className="relative mt-7 sm:mt-10 sm:max-w-2xl" />
      </section>

      <Section title={hr.home.recipes}>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {EXAMPLE_RECIPES.map((r) => (
            <Link
              key={r.slug}
              href={`/recept/novi?primjer=${r.slug}`}
              className={cn(
                "group relative flex h-28 flex-col justify-between rounded-[20px] p-3.5 transition-transform active:scale-[0.97] sm:h-32 sm:p-5",
                r.tone,
              )}
            >
              <span className="tabular text-[11px] font-bold uppercase tracking-wider opacity-70">{hr.home.swaps(r.swaps)}</span>
              <span className="font-heading text-lg font-bold leading-none text-cocoa-900 sm:text-2xl">{r.label}</span>
              <ArrowUpRight className="absolute right-3 top-3 size-4 opacity-40 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </Section>

      <OftenBought />

      <Section
        title={hr.home.deals}
        action={
          <Link href="/trazi?akcija=1" className="inline-flex items-center text-sm font-semibold text-mint-700">
            {hr.home.all}
            <ChevronRight className="size-4" />
          </Link>
        }
      >
        <Suspense fallback={<DealsSkeleton />}>
          <Deals />
        </Suspense>
      </Section>
    </main>
  );
}

async function Deals() {
  const deals = await getTodaysDeals(8);
  return (
    <ProductGrid>
      {deals.map((p) => (
        <ProductCard key={p.itemId} product={p} source="search" />
      ))}
    </ProductGrid>
  );
}

function DealsSkeleton() {
  return (
    <ProductGrid>
      {Array.from({ length: 4 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </ProductGrid>
  );
}
