"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowDownNarrowWide, ArrowUpNarrowWide, Coins, HeartPulse, Minus, Plus, ShoppingBasket, Sparkles, Store, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatSize, nameHasSize } from "@/lib/format";
import { hr } from "@/lib/i18n/hr";
import { basketStore, useBasketState } from "@/lib/basket/local-store";
import { NUTRITION_METRICS, type NutritionMetric, type SortOrder, type Strategy } from "@/lib/basket/types";
import type { BasketView, LineView } from "@/lib/basket/view";
import { ChainBadge } from "@/components/catalog/chain-badge";
import { ProductIcon } from "@/components/catalog/product-icon";

const STRATEGY_ICONS = { one_store: Store, cheapest: Coins, nutrition: HeartPulse } as const;
const DEFAULT_ORDER: Record<NutritionMetric, SortOrder> = {
  energy_kcal: "asc", fat: "asc", saturated_fat: "asc", carbohydrates: "asc", sugars: "asc", proteins: "desc", salt: "asc", fiber: "desc",
};
const UNIT: Record<NutritionMetric, string> = {
  energy_kcal: "kcal", fat: "g", saturated_fat: "g", carbohydrates: "g", sugars: "g", proteins: "g", salt: "g", fiber: "g",
};

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
    <div className="pb-36">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-normal leading-tight text-cocoa-900 sm:text-4xl">{hr.basket.title}</h1>
          <p className="mt-1 text-sm text-cocoa-500">{hr.search.count(items.length)}</p>
        </div>
        <button type="button" onClick={() => basketStore.clear()} className="text-xs font-medium text-cocoa-400 hover:text-clay-600">
          Isprazni
        </button>
      </div>

      <StrategyPicker value={strategy} onChange={setStrategy} />
      {strategy === "nutrition" && (
        <MetricPicker
          metric={metric}
          order={order}
          onMetric={(m) => {
            setMetric(m);
            setOrder(DEFAULT_ORDER[m]);
          }}
          onOrder={setOrder}
        />
      )}

      <div className={cn("transition-opacity", loading && view && "opacity-60")}>
        {!view ? (
          <div className="mt-6 space-y-3">
            <div className="h-40 animate-pulse rounded-2xl bg-card ring-1 ring-border" />
            <div className="h-28 animate-pulse rounded-2xl bg-card ring-1 ring-border" />
          </div>
        ) : (
          <>
            <Notice view={view} />
            <div className="mt-4 space-y-4">
              {view.groups.map((g) => (
                <ChainGroupCard key={g.chainCode} group={g} strategy={strategy} metric={metric} />
              ))}
            </div>
            {view.unpriced.length > 0 && (
              <div className="mt-4 rounded-2xl bg-oat-200/50 p-4 ring-1 ring-border/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-400">{hr.basket.unpriced}</p>
                <ul className="mt-2 space-y-1 text-sm text-cocoa-500">
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
            <SummaryBar view={view} strategy={strategy} metric={metric} />
          </>
        )}
      </div>
    </div>
  );
}

function StrategyPicker({ value, onChange }: { value: Strategy; onChange: (s: Strategy) => void }) {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-oat-200/70 p-1" role="radiogroup" aria-label="Način slaganja košarice">
        {(Object.keys(hr.basket.strategies) as Strategy[]).map((s) => {
          const Icon = STRATEGY_ICONS[s];
          const active = value === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(s)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all sm:flex-row sm:justify-center sm:gap-2 sm:text-sm",
                active ? "bg-card text-mint-700 shadow-soft" : "text-cocoa-500 hover:text-cocoa-700",
              )}
            >
              <Icon className="size-4" />
              {hr.basket.strategies[s]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-xs text-cocoa-400">{hr.basket.strategyHints[value]}</p>
    </div>
  );
}

function MetricPicker({
  metric, order, onMetric, onOrder,
}: { metric: NutritionMetric; order: SortOrder; onMetric: (m: NutritionMetric) => void; onOrder: (o: SortOrder) => void }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="-mx-4 flex flex-1 gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        {NUTRITION_METRICS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMetric(m)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
              metric === m ? "bg-mint-600 text-oat-50 ring-mint-600" : "bg-card text-cocoa-500 ring-border hover:text-cocoa-700",
            )}
          >
            {hr.nutrition[m]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onOrder(order === "asc" ? "desc" : "asc")}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-cocoa-700 ring-1 ring-border"
        aria-label="Smjer"
      >
        {order === "asc" ? <ArrowUpNarrowWide className="size-3.5" /> : <ArrowDownNarrowWide className="size-3.5" />}
        {hr.basket.order[order]}
      </button>
    </div>
  );
}

function Notice({ view }: { view: BasketView }) {
  if (view.strategy !== "one_store") return null;
  if (view.scattered) {
    return (
      <p className="mt-5 flex items-start gap-2 rounded-xl bg-honey-100 px-3.5 py-2.5 text-sm text-honey-700">
        <AlertCircle className="mt-0.5 size-4 shrink-0" /> {hr.basket.scattered}
      </p>
    );
  }
  if (view.groups.length === 1) {
    return (
      <p className="mt-5 flex items-center gap-2 rounded-xl bg-mint-100 px-3.5 py-2.5 text-sm font-medium text-mint-800">
        <Sparkles className="size-4 shrink-0" /> {hr.basket.bestSingle(view.groups[0].chainName, 0)}
      </p>
    );
  }
  const b = view.bestSingleChain;
  return b ? (
    <p className="mt-5 rounded-xl bg-oat-200/60 px-3.5 py-2.5 text-sm text-cocoa-500">
      {hr.basket.bestSingle(b.chainName, b.missing.length)}: {b.missing.join(", ")}
    </p>
  ) : null;
}

function ChainGroupCard({ group, strategy, metric }: { group: BasketView["groups"][number]; strategy: Strategy; metric: NutritionMetric }) {
  const where =
    group.chainKind === "webshop" ? hr.product.online
    : group.storesWithAll === "all" ? hr.basket.allStores
    : group.storesWithAll.map((s) => s.address).filter(Boolean).join(" · ") || "—";
  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/70">
      <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-oat-50 px-4 py-3">
        <div className="min-w-0">
          <ChainBadge code={group.chainCode} name={group.chainName} kind={group.chainKind} size="md" />
          <p className="mt-0.5 truncate pl-4 text-xs text-cocoa-400">
            {hr.basket.availableIn}: {where}
          </p>
        </div>
        <span className="tabular text-base font-semibold text-cocoa-900">{formatPrice(group.subtotal)}</span>
      </header>
      <ul className="divide-y divide-border/50">
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
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <ProductIcon group={o.conceptGroup ?? null} name={o.name} className="size-12" iconClassName="size-5" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-snug text-cocoa-900">{o.name}</p>
        <p className="mt-0.5 text-xs text-cocoa-400">
          {[l.kind === "concept" ? `za: ${l.label}` : o.brand, size].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {l.kind === "product" ? (
            <Stepper value={l.packages} onChange={(n) => basketStore.setPackages(l.basketItemId, n)} />
          ) : (
            <span className="text-xs text-cocoa-500">{hr.basket.packages(l.packages)}</span>
          )}
          {o.isAkcija && <span className="rounded-full bg-apricot-100 px-2 py-0.5 text-[11px] font-semibold text-apricot-700">{hr.product.akcija}</span>}
          {strategy === "nutrition" && (
            <span className="tabular rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-medium text-mint-700">
              {hr.nutrition[metric]}: {nutrient == null ? hr.nutrition.unknown : `${String(nutrient).replace(".", ",")} ${UNIT[metric]} / 100 g`}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <span className={cn("tabular text-[15px] font-semibold", o.isAkcija ? "text-apricot-700" : "text-cocoa-900")}>
          {formatPrice(l.lineCost)}
        </span>
        {l.packages > 1 && <span className="tabular text-[11px] text-cocoa-400">{l.packages} × {formatPrice(o.price)}</span>}
        {l.usedCost != null && l.kind === "concept" && (
          <span className="tabular text-[11px] text-cocoa-400">{hr.basket.used} {formatPrice(l.usedCost)}</span>
        )}
        <button
          type="button"
          onClick={() => basketStore.remove(l.basketItemId)}
          aria-label={hr.basket.remove}
          className="mt-1 grid size-7 place-items-center rounded-full text-cocoa-300 transition-colors hover:bg-clay-100 hover:text-clay-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-full bg-oat-100 ring-1 ring-border">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} className="grid size-7 place-items-center text-cocoa-500 disabled:opacity-30" aria-label="Manje">
        <Minus className="size-3.5" />
      </button>
      <span className="tabular w-6 text-center text-sm font-medium text-cocoa-900">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="grid size-7 place-items-center text-cocoa-500" aria-label="Više">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function SummaryBar({ view, strategy, metric }: { view: BasketView; strategy: Strategy; metric: NutritionMetric }) {
  const n = view.nutritionSummary[metric];
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-oat-100/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs text-cocoa-400">
            {hr.basket.total} · {view.groups.length} {view.groups.length === 1 ? "trgovina" : view.groups.length < 5 ? "trgovine" : "trgovina"}
          </p>
          <p className="tabular font-heading text-[1.75rem] font-medium leading-none text-cocoa-900">{formatPrice(view.total)}</p>
        </div>
        <div className="text-right">
          {strategy === "nutrition" && n ? (
            <p className="tabular text-sm font-medium text-mint-700">
              {hr.nutrition[metric]}: {Math.round(n.value)} {UNIT[metric]}
              {!n.complete && <span className="block text-[11px] font-normal text-cocoa-400">djelomični podaci</span>}
            </p>
          ) : view.saving > 0 ? (
            <p className="rounded-full bg-mint-100 px-3 py-1.5 text-xs font-semibold text-mint-800">{hr.basket.saving(formatPrice(view.saving))}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyBasket() {
  return (
    <div className="mx-auto mt-10 max-w-sm text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint-100 text-mint-600">
        <ShoppingBasket className="size-7" />
      </span>
      <h1 className="mt-5 text-3xl font-normal text-cocoa-900">{hr.basket.empty}</h1>
      <p className="mt-2 text-sm text-cocoa-500">{hr.basket.emptyHint}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/trazi" className="rounded-full bg-cocoa-900 px-4 py-2.5 text-sm font-medium text-oat-50 hover:bg-cocoa-700">
          {hr.basket.goSearch}
        </Link>
        <Link href="/" className="rounded-full bg-card px-4 py-2.5 text-sm font-medium text-cocoa-700 ring-1 ring-border hover:bg-mint-50">
          {hr.smartInput.veganize}
        </Link>
      </div>
    </div>
  );
}

function BasketSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-oat-200" />
      <div className="h-14 animate-pulse rounded-2xl bg-oat-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-card ring-1 ring-border" />
    </div>
  );
}
