import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { SmartInput } from "@/components/smart-input";
import { Character } from "@/components/brand/sprites";
import { OftenBought } from "@/components/home/often-bought";
import { Ticker } from "@/components/home/ticker";
import { ProductCard, ProductCardSkeleton, ProductGrid } from "@/components/catalog/product-card";
import { Section, Strip } from "@/components/section";
import { getTodaysDeals } from "@/lib/catalog/queries";
import { EXAMPLE_RECIPES } from "@/lib/examples";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <Lead />
      <Ticker />
      <Section title={hr.home.recipes}>
        <Sheets />
      </Section>
      <OftenBought />
      <Section
        title={hr.home.deals}
        action={
          <Link href="/trazi?akcija=1" className="inline-flex items-center text-sm font-extrabold text-ink underline-offset-4 hover:underline">
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

function Lead() {
  return (
    <section className="relative pb-2 pt-6 sm:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-10 -z-10 size-[26rem] rounded-full bg-[radial-gradient(closest-side,var(--blush),transparent)]"
      />
      <Character id="avocado" className="character pointer-events-none absolute right-0 top-2 hidden w-24 rotate-12 sm:block" />
      <h1 className="max-w-4xl text-[3.2rem] leading-[0.92] text-ink sm:text-7xl lg:text-[6.2rem]">
        {hr.home.title} <span className="block text-guava-deep">{hr.home.titleAccent}</span>
      </h1>
      <p className="mt-4 text-lg font-extrabold text-rind sm:text-2xl">{hr.home.subtitle}</p>

      <div className="relative mt-7">
        <SmartInput className="-rotate-[0.6deg]" />
        <Character id="carrot" className="character pointer-events-none absolute -bottom-10 -left-5 hidden w-14 -rotate-[18deg] sm:block" />
      </div>

      <p className="mt-5 text-[15px] font-semibold leading-snug text-rind">{hr.home.hint}</p>
      <ol className="mt-3 flex flex-wrap gap-2">
        {hr.home.steps.map((s, i) => (
          <li key={s} className="blob blob-pill blob-fill-oat-200 flex items-center gap-2 py-1.5 pl-1.5 pr-4 text-sm font-bold text-ink">
            <b className="blob blob-round blob-fill-guava grid size-6 place-items-center text-xs font-black">{i + 1}</b>
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}

const SHEET_STYLE = [
  "blob-fill-blush -rotate-[2.5deg]",
  "blob-fill-smoke-light rotate-[1.5deg]",
  "blob-fill-pistachio -rotate-[1deg]",
];

/** Example recipes as soft, slightly rotated blobs. */
function Sheets() {
  return (
    <Strip>
      {EXAMPLE_RECIPES.map((r, i) => (
        <Link
          key={r.slug}
          href={r.href}
          className={cn(
            "blob blob-float flex h-48 w-56 shrink-0 snap-start flex-col px-6 py-6 transition-transform duration-300 hover:z-10 hover:-translate-y-2 hover:rotate-0 sm:h-56 sm:w-auto sm:flex-1",
            SHEET_STYLE[i],
          )}
        >
          <span className="micro block text-ink/70">
            0{i + 1} / {r.source}
          </span>
          <span className="mt-3 font-heading text-[1.9rem] font-black leading-none text-ink">{r.label}</span>
          <span className="micro mt-2 text-rind">{hr.home.swaps(r.swaps)}</span>
          {r.slug === "sarma" ? (
            <Image src="/illustrations/sarma-pot.png" alt="" width={140} height={140} className="absolute -bottom-2 right-1 w-28 sm:w-32" />
          ) : (
            <Character id={r.slug === "palacinke" ? "oat" : "almond"} className="character absolute bottom-3 right-4 h-24 w-auto rotate-6" />
          )}
        </Link>
      ))}
    </Strip>
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
