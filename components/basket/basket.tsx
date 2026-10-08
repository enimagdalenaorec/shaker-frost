"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, Coins, HeartPulse, Minus, Plus, ShoppingBasket, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatSize, nameHasSize } from "@/lib/format";
import { hr } from "@/lib/i18n/hr";
import { basketStore, useBasketState } from "@/lib/basket/local-store";
import { NUTRITION_METRICS, type NutritionMetric, type SortOrder, type Strategy } from "@/lib/basket/types";
import type { BasketView, LineView } from "@/lib/basket/view";
import { chainColor } from "@/components/catalog/chain-badge";
import { ProductIcon } from "@/components/catalog/product-icon";

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
        <h1 className="flex items-center gap-2.5 text-3xl font-bold text-cocoa-900">
          {hr.basket.title}
          <span className="tabular rounded-full bg-oat-200 px-2 py-0.5 font-sans text-sm font-bold text-cocoa-500">{items.length}</span>
        </h1>
        <button type="button" onClick={() => basketStore.clear()} className="text-xs font-semibold text-cocoa-400 hover:text-clay-600">
          {hr.basket.clear}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-[18px] bg-oat-200/80 p-1" role="radiogroup" aria-label="Način slaganja">
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
                "flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[12px] font-bold transition-all sm:text-sm",
                active ? "bg-cocoa-900 text-oat-50" : "text-cocoa-500 hover:text-cocoa-900",
              )}
            >
              <Icon className="hidden size-4 min-[400px]:block" />
              {hr.basket.strategies[s]}
            </button>
          );
        })}
      </div>

      {strategy === "nutrition" && (
        <div className="mt-2 flex items-center gap-1.5">
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
                  "h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors",
                  metric === m ? "bg-mint-600 text-oat-50" : "bg-oat-50 text-cocoa-500 ring-1 ring-cocoa-900/[0.08]",
                )}
              >
                {hr.nutrition[m]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-oat-50 text-cocoa-700 ring-1 ring-cocoa-900/[0.08]"
            aria-label={hr.basket.order[order]}
            title={hr.basket.order[order]}
          >
            {order === "asc" ? <ArrowUpNarrowWide className="size-4" /> : <ArrowDownWideNarrow className="size-4" />}
          </button>
        </div>
      )}

      <div className={cn("transition-opacity", loading && view && "opacity-50")}>
        {!view ? (
          <div className="mt-4 space-y-2.5">
            <div className="h-40 animate-pulse rounded-[22px] bg-oat-50" />
            <div className="h-28 animate-pulse rounded-[22px] bg-oat-50" />
          </div>
        ) : (
          <>
            <Notice view={view} />
            <div className="mt-3 space-y-2.5">
              {view.groups.map((g) => (
                <ChainGroupCard key={g.chainCode} group={g} strategy={strategy} metric={metric} />
              ))}
            </div>
            {view.unpriced.length > 0 && (
              <div className="mt-2.5 rounded-[22px] bg-oat-200/60 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-cocoa-400">{hr.basket.unpriced}</p>
                <ul className="mt-1.5 space-y-1 text-sm text-cocoa-500">
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
  const pill = "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold";
  if (view.scattered) return <p className={cn(pill, "bg-honey-100 text-honey-700")}>{hr.basket.scattered}</p>;
  if (view.groups.length === 1) {
    return (
      <p className={cn(pill, "bg-mint-100 text-mint-800")}>
        <Check className="size-3.5" /> {hr.basket.allInOne(view.groups[0].chainName)}
      </p>
    );
  }
  const b = view.bestSingleChain;
  return b ? (
    <p className={cn(pill, "bg-oat-200 text-cocoa-500")} title={b.missing.join(", ")}>
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
    <section
      className="overflow-hidden rounded-[22px] bg-card ring-1 ring-cocoa-900/[0.06]"
      style={{ boxShadow: `inset 4px 0 0 ${chainColor(group.chainCode)}` }}
    >
      <header className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-3.5">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold leading-tight text-cocoa-900">{group.chainName}</h2>
          <p className="truncate text-xs text-cocoa-400">{where}</p>
        </div>
        <span className="tabular font-heading text-lg font-bold text-cocoa-900">{formatPrice(group.subtotal)}</span>
      </header>
      <ul>
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
  const meta = [l.kind === "concept" ? `za: ${l.label}` : null, size].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <ProductIcon group={o.conceptGroup ?? null} name={o.name} className="size-12 rounded-[14px]" iconClassName="size-5" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] font-semibold leading-tight text-cocoa-900">{o.name}</p>
        {meta && <p className="mt-0.5 text-xs text-cocoa-400">{meta}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {l.kind === "product" ? (
            <Stepper value={l.packages} onChange={(n) => basketStore.setPackages(l.basketItemId, n)} />
          ) : (
            <span className="text-xs font-medium text-cocoa-500">{hr.basket.packages(l.packages)}</span>
          )}
          {strategy === "nutrition" && (
            <span className="tabular rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-bold text-mint-700">
              {nutrient == null ? hr.nutrition.unknown : `${fmt(nutrient)} ${UNIT[metric]}`}
              <span className="font-medium text-mint-600/70"> /100 g</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn("tabular text-[15px] font-bold", o.isAkcija ? "text-apricot-700" : "text-cocoa-900")}>
          {formatPrice(l.lineCost)}
        </span>
        <button
          type="button"
          onClick={() => basketStore.remove(l.basketItemId)}
          aria-label={hr.basket.remove}
          className="grid size-7 place-items-center rounded-full text-cocoa-300 transition-colors hover:bg-clay-100 hover:text-clay-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex h-7 items-center rounded-full bg-oat-200/70">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} className="grid size-7 place-items-center text-cocoa-700 disabled:opacity-30" aria-label="Manje">
        <Minus className="size-3.5" />
      </button>
      <span className="tabular w-5 text-center text-xs font-bold text-cocoa-900">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="grid size-7 place-items-center text-cocoa-700" aria-label="Više">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function Summary({ view, strategy, metric }: { view: BasketView; strategy: Strategy; metric: NutritionMetric }) {
  const n = view.nutritionSummary[metric];
  return (
    <div className="fixed inset-x-3 bottom-[5.25rem] z-30 sm:inset-x-0 sm:bottom-5">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-[22px] bg-mint-700 px-5 py-3.5 text-oat-50 shadow-lift sm:mx-6 md:mx-auto">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mint-200">
            {hr.basket.total} · {hr.basket.stores(view.groups.length)}
          </p>
          <p className="tabular font-heading text-[1.9rem] font-bold leading-none">{formatPrice(view.total)}</p>
        </div>
        {strategy === "nutrition" && n ? (
          <p className="tabular text-right text-sm font-bold">
            {hr.nutrition[metric]}
            <span className="block font-heading text-xl">
              {fmt(n.value)} {UNIT[metric]}
            </span>
          </p>
        ) : view.saving > 0 ? (
          <span className="tabular rounded-full bg-mint-200 px-3 py-1.5 text-sm font-bold text-mint-800">{hr.basket.saving(formatPrice(view.saving))}</span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyBasket() {
  return (
    <div className="mt-16 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-[26px] bg-mint-100 text-mint-600">
        <ShoppingBasket className="size-9" strokeWidth={1.6} />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-cocoa-900">{hr.basket.empty}</h1>
      <Link href="/trazi" className="mt-5 inline-flex h-11 items-center rounded-full bg-cocoa-900 px-5 text-sm font-bold text-oat-50">
        {hr.basket.goSearch}
      </Link>
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
