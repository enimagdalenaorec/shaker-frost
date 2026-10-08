"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, Coins, HeartPulse, Minus, Plus, Sparkles, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatSize, nameHasSize } from "@/lib/format";
import { hr } from "@/lib/i18n/hr";
import { basketStore, useBasketState } from "@/lib/basket/local-store";
import { NUTRITION_METRICS, type NutritionMetric, type SortOrder, type Strategy } from "@/lib/basket/types";
import type { BasketView, LineView } from "@/lib/basket/view";
import { ChainBadge } from "@/components/catalog/chain-badge";
import { Character } from "@/components/brand/sprites";

const STRATEGY_ICONS = { one_store: Store, cheapest: Coins, nutrition: HeartPulse } as const;
const DEFAULT_ORDER: Record<NutritionMetric, SortOrder> = {
  energy_kcal: "asc", fat: "asc", saturated_fat: "asc", carbohydrates: "asc", sugars: "asc", proteins: "desc", salt: "asc", fiber: "desc",
};
const UNIT: Record<NutritionMetric, string> = {
  energy_kcal: "kcal", fat: "g", saturated_fat: "g", carbohydrates: "g", sugars: "g", proteins: "g", salt: "g", fiber: "g",
};
const fmt = (n: number) => new Intl.NumberFormat("hr-HR", { maximumFractionDigits: 1 }).format(n);

export function Basket() {
  const { items } = useBasketState();
  const [hydrated, setHydrated] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("one_store");
  const [metric, setMetric] = useState<NutritionMetric>("proteins");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [view, setView] = useState<BasketView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!items.length) {
      setView(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/basket/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items, strategy, metric, order }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((v: BasketView) => setView(v))
      .catch(() => {})
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [items, strategy, metric, order]);

  if (!hydrated) return <BasketSkeleton />;
  if (!items.length) return <EmptyBasket />;

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="title-bar text-[2.6rem] leading-none text-ink">{hr.basket.title}</h1>
        <span className="micro blob blob-fill-oat-200 px-3 py-1 font-bold text-ink">Popis / {items.length}</span>
      </div>
      <div className="mt-1 flex justify-end">
        <button type="button" onClick={() => basketStore.clear()} className="text-xs font-extrabold text-rind underline-offset-4 hover:text-ink hover:underline">
          {hr.basket.clear}
        </button>
      </div>

      <div className="pebble mt-3 bg-paper p-3 shadow-soft">
      <p className="micro mb-2 text-rind">Način slaganja</p>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Način slaganja">
        {(Object.keys(hr.basket.strategies) as Strategy[]).map((s) => {
          const Icon = STRATEGY_ICONS[s];
          const active = strategy === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setStrategy(s)}
              className={cn(
                "blob flex h-11 items-center justify-center gap-1.5 text-[12px] font-extrabold transition-colors sm:blob-pill sm:text-sm",
                active ? "blob-fill-ink text-cream" : "blob-fill-oat-200 text-ink hover:blob-fill-pistachio-light",
              )}
            >
              <Icon className="hidden size-4 min-[400px]:block" />
              {hr.basket.strategies[s]}
            </button>
          );
        })}
      </div>

      {strategy === "nutrition" && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="-ml-4 flex flex-1 gap-1.5 overflow-x-auto pb-1 pl-4 scrollbar-none sm:ml-0 sm:flex-wrap sm:pl-0">
            {NUTRITION_METRICS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMetric(m);
                  setOrder(DEFAULT_ORDER[m]);
                }}
                className={cn(
                  "blob h-8 shrink-0 px-3.5 text-xs font-extrabold text-ink",
                  metric === m ? "blob-fill-pistachio" : "blob-fill-oat-200 hover:blob-fill-pistachio-light",
                )}
              >
                {hr.nutrition[m]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
            className="blob blob-round blob-fill-oat-200 grid size-8 shrink-0 place-items-center text-ink hover:blob-fill-pistachio-light"
            aria-label={hr.basket.order[order]}
            title={hr.basket.order[order]}
          >
            {order === "asc" ? <ArrowUpNarrowWide className="size-4" /> : <ArrowDownWideNarrow className="size-4" />}
          </button>
        </div>
      )}
      </div>

      <div className={cn("transition-opacity", loading && view && "opacity-50")}>
        {!view ? (
          <div className="mt-4 space-y-2.5">
            <div className="pebble h-40 animate-pulse bg-paper/70" />
            <div className="pebble h-28 animate-pulse bg-paper/70" />
          </div>
        ) : (
          <>
            <Notice view={view} />
            <div className="mt-3 space-y-3.5">
              {view.groups.map((g) => (
                <ChainGroupCard key={g.chainCode} group={g} strategy={strategy} metric={metric} />
              ))}
            </div>
            {view.unpriced.length > 0 && (
              <div className="pebble mt-3 bg-oat-200/60 px-4 py-3">
                <p className="micro text-rind">{hr.basket.unpriced}</p>
                <ul className="mt-1.5 space-y-1 text-sm font-semibold text-ink">
                  {view.unpriced.map((u) => (
                    <li key={u.basketItemId} className="flex items-center justify-between">
                      {u.label}
                      <button onClick={() => basketStore.remove(u.basketItemId)} aria-label={hr.basket.remove}>
                        <X className="size-4 text-cocoa-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Summary view={view} strategy={strategy} metric={metric} />
          </>
        )}
      </div>
    </div>
  );
}

function Notice({ view }: { view: BasketView }) {
  if (view.strategy !== "one_store") return null;
  const pill = "blob mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold text-ink";
  if (view.scattered) return <p className={cn(pill, "blob-fill-ochre-light")}>{hr.basket.scattered}</p>;
  if (view.groups.length === 1) {
    return (
      <p className={cn(pill, "blob-fill-pistachio")}>
        <Check className="size-3.5" /> {hr.basket.allInOne(view.groups[0].chainName)}
      </p>
    );
  }
  const b = view.bestSingleChain;
  return b ? (
    <p className={cn(pill, "blob-fill-oat-200")} title={b.missing.join(", ")}>
      {hr.basket.missingIn(b.chainName, b.missing.length)}
    </p>
  ) : null;
}

function ChainGroupCard({ group, strategy, metric }: { group: BasketView["groups"][number]; strategy: Strategy; metric: NutritionMetric }) {
  const where =
    group.chainKind === "webshop" ? hr.product.online
    : group.storesWithAll === "all" ? hr.basket.allStores
    : group.storesWithAll.map((s) => s.address).filter(Boolean).join(" · ") || "—";
  return (
    <section className="pebble bg-paper px-4 pb-1 pt-3.5 shadow-soft">
      <header className="flex items-center justify-between gap-3 pb-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <ChainBadge code={group.chainCode} name={group.chainName} kind={group.chainKind} size="md" />
          <p className="truncate text-xs font-semibold text-rind">{where}</p>
        </div>
        <span className="tabular font-heading text-xl font-black text-ink">{formatPrice(group.subtotal)}</span>
      </header>
      <ul className="divide-y divide-ink/[0.08] border-t border-ink/10">
        {group.lines.map((l) => (
          <BasketLine key={l.basketItemId} line={l} strategy={strategy} metric={metric} />
        ))}
      </ul>
    </section>
  );
}

function BasketLine({ line: l, strategy, metric }: { line: LineView; strategy: Strategy; metric: NutritionMetric }) {
  const o = l.offer;
  const size = nameHasSize(o.name, formatSize(o.netQty, o.unit)) ? null : formatSize(o.netQty, o.unit);
  const nutrient = o.nutrition[metric];
  const isSwap = l.kind === "concept";
  const meta = isSwap ? [l.forIngredient ? `za: ${l.forIngredient}` : null, hr.basket.packages(l.packages)].filter(Boolean).join(" · ") : size;
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-extrabold leading-tight text-ink">{isSwap ? l.label : o.name}</p>
        {meta && <p className="mt-0.5 text-xs font-semibold text-rind">{meta}</p>}
        {isSwap && (
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-ink/80" title="Odabrano prema načinu slaganja">
            <Sparkles className="size-3 shrink-0" />
            <span className="truncate">{o.name}</span>
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {!isSwap && <Stepper value={l.packages} onChange={(n) => basketStore.setPackages(l.basketItemId, n)} />}
          {strategy === "nutrition" && (
            <span className="blob blob-fill-pistachio-pale tabular px-2.5 py-0.5 text-[11px] font-extrabold text-ink">
              {nutrient == null ? hr.nutrition.unknown : `${fmt(nutrient)} ${UNIT[metric]}`}
              <span className="font-semibold text-rind"> /100 g</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn("tabular font-heading text-lg font-black leading-none", o.isAkcija ? "text-guava-deep" : "text-ink")}>
          {formatPrice(l.lineCost)}
        </span>
        <button
          type="button"
          onClick={() => basketStore.remove(l.basketItemId)}
          aria-label={hr.basket.remove}
          className="grid size-7 place-items-center rounded-full text-ink/45 transition-colors hover:bg-guava-light hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="blob blob-fill-oat-200 inline-flex h-7 items-center px-0.5">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} className="grid size-6 place-items-center text-ink disabled:opacity-30" aria-label="Manje">
        <Minus className="size-3.5" />
      </button>
      <span className="tabular w-5 text-center text-xs font-black text-ink">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="grid size-6 place-items-center text-ink" aria-label="Više">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function Summary({ view, strategy, metric }: { view: BasketView; strategy: Strategy; metric: NutritionMetric }) {
  const n = view.nutritionSummary[metric];
  return (
    <div className="fixed inset-x-3 bottom-[5.25rem] z-30 sm:inset-x-0 sm:bottom-5">
      <div className="blob blob-pill blob-float blob-fill-ink mx-auto flex max-w-3xl items-center justify-between gap-3 py-3.5 pl-7 pr-5 text-cream sm:mx-6 sm:blob-long md:mx-auto">
        <div>
          <p className="micro text-cream/70">
            {hr.basket.total} · {hr.basket.stores(view.groups.length)}
          </p>
          <p className="tabular font-heading text-[2rem] font-black leading-none">{formatPrice(view.total)}</p>
        </div>
        {strategy === "nutrition" && n ? (
          <p className="tabular text-right text-sm font-bold">
            {hr.nutrition[metric]}
            <span className="block font-heading text-xl">
              {fmt(n.value)} {UNIT[metric]}
            </span>
          </p>
        ) : view.saving > 0 ? (
          <span className="blob blob-fill-ochre tabular px-3.5 py-1.5 text-sm font-black text-ink">{hr.basket.saving(formatPrice(view.saving))}</span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyBasket() {
  return (
    <div className="mt-10 text-center">
      <Character id="tofu" className="character bob mx-auto w-24" />
      <h1 className="mt-4 text-3xl text-ink">{hr.basket.empty}</h1>
      <p className="mx-auto mt-2 max-w-xs font-semibold text-rind">Prazna kao hladnjak u nedjelju navečer.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/" className="btn btn-guava h-12 px-5">Veganiziraj recept ↗</Link>
        <Link href="/trazi" className="btn btn-paper h-12 px-5">{hr.basket.goSearch}</Link>
      </div>
    </div>
  );
}

function BasketSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-9 w-40 animate-pulse rounded-lg bg-oat-200" />
      <div className="h-[52px] animate-pulse rounded-[18px] bg-oat-200" />
      <div className="h-40 animate-pulse rounded-[22px] bg-oat-50" />
    </div>
  );
}
