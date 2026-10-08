import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, Leaf, Search } from "lucide-react";
import { SmartInput } from "@/components/smart-input";
import { OftenBought } from "@/components/home/often-bought";
import { ProductCard, ProductCardSkeleton } from "@/components/catalog/product-card";
import { Section, Strip } from "@/components/section";
import { getTodaysDeals } from "@/lib/catalog/queries";
import { EXAMPLE_RECIPES, EXAMPLE_SEARCHES } from "@/lib/examples";
import { hr } from "@/lib/i18n/hr";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <Hero />
      <Steps />
      <OftenBought />
      <Section title={hr.home.dealsTitle} subtitle={hr.home.dealsSubtitle}>
        <Suspense fallback={<DealsSkeleton />}>
          <Deals />
        </Suspense>
      </Section>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative pb-4 pt-12 text-center sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 -z-10 mx-auto h-[26rem] max-w-3xl rounded-full bg-[radial-gradient(closest-side,var(--mint-200),transparent)] opacity-70 blur-2xl"
      />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-mint-700 ring-1 ring-mint-200">
        <Leaf className="size-3.5" /> {hr.home.eyebrow}
      </span>
      <h1 className="mx-auto mt-5 max-w-3xl text-[2.6rem] font-normal leading-[1.05] text-cocoa-900 sm:text-6xl">
        Svaki recept može biti <em className="font-medium text-mint-600">veganski.</em>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-cocoa-500 sm:text-base">{hr.home.subtitle}</p>

      <SmartInput className="mx-auto mt-8 max-w-2xl" autoFocus={false} />

      <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center gap-2.5 text-sm">
        <ChipRow label={hr.home.tryRecipes}>
          {EXAMPLE_RECIPES.map((r) => (
            <Link
              key={r.slug}
              href={`/recept/novi?primjer=${r.slug}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-cocoa-700 ring-1 ring-border transition-colors hover:bg-mint-50 hover:text-mint-700 hover:ring-mint-200"
            >
              <BookOpen className="size-3.5 text-mint-500" />
              {r.label}
            </Link>
          ))}
        </ChipRow>
        <ChipRow label={hr.home.trySearch}>
          {EXAMPLE_SEARCHES.map((q) => (
            <Link
              key={q}
              href={`/trazi?q=${encodeURIComponent(q)}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-cocoa-700 ring-1 ring-border transition-colors hover:bg-oat-200"
            >
              <Search className="size-3.5 text-cocoa-400" />
              {q}
            </Link>
          ))}
        </ChipRow>
      </div>
    </section>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex max-w-full items-center gap-2 overflow-x-auto px-1 scrollbar-none">
      <span className="w-[4.5rem] shrink-0 text-right text-xs font-medium uppercase tracking-wide text-cocoa-400">{label}</span>
      {children}
    </div>
  );
}

function Steps() {
  return (
    <ol className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
      {hr.home.steps.map((s, i) => (
        <li key={s.title} className="flex gap-4 rounded-2xl bg-card/60 p-4 ring-1 ring-border/60 sm:flex-col sm:gap-2 sm:p-5">
          <span className="font-heading text-3xl italic leading-none text-mint-400">{i + 1}</span>
          <div>
            <h3 className="font-sans text-[15px] font-semibold text-cocoa-900">{s.title}</h3>
            <p className="mt-0.5 text-sm text-cocoa-500">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

async function Deals() {
  const deals = await getTodaysDeals(10);
  return (
    <Strip>
      {deals.map((p) => (
        <ProductCard key={p.itemId} product={p} source="search" />
      ))}
    </Strip>
  );
}

function DealsSkeleton() {
  return (
    <Strip>
      {Array.from({ length: 5 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </Strip>
  );
}
