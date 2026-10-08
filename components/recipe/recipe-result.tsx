"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Home, Lightbulb, Plus, Share2, ShoppingBasket, Sparkles, Store } from "lucide-react";
import { setRecipeSaved } from "@/app/actions/user";
import { setPendingAction, signInWithGoogle, useAuth } from "@/lib/auth/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPrice, formatSize } from "@/lib/format";
import { basketStore } from "@/lib/basket/local-store";
import { hr } from "@/lib/i18n/hr";
import { ChainBadge } from "@/components/catalog/chain-badge";
import { ProductIcon } from "@/components/catalog/product-icon";
import type { AlternativeView, IngredientView, RecipeView } from "@/lib/recipe/load";

const ROLE_LABEL: Record<string, string> = {
  binder: "veže", leavening: "diže tijesto", base: "glavni sastojak", smoky: "dimljeni okus", frying: "za prženje",
  flavour: "za okus", baking: "u tijestu", creaminess: "kremoznost", sweet: "zaslađuje", liquid: "tekućina", any: "",
};

const qty = (q: number | null, unit: string | null) =>
  q == null ? null : unit === "kom" ? `${q} kom` : formatSize(q, unit) ?? `${q} ${unit ?? ""}`;

/** The basket gets the alternative ("chia"); the product and shop are chosen there per sort mode. */
function addSwap(recipeId: string, ingredient: IngredientView, alt: AlternativeView) {
  basketStore.add(
    {
      kind: "concept",
      conceptId: alt.conceptId!,
      facets: alt.facets,
      label: alt.label,
      forIngredient: ingredient.name,
      requiredQty: alt.requiredQty,
      requiredUnit: (alt.requiredUnit as "g" | "ml" | null) ?? null,
      recipeId,
    },
    "recipe",
  );
}

export function RecipeResult({ recipe }: { recipe: RecipeView }) {
  const risky = recipe.ingredients.filter((i) => i.status !== "vegan" && i.alternatives.length);
  const check = recipe.ingredients.filter((i) => i.status === "depends" && !i.alternatives.length);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(risky.map((i) => [i.id, i.alternatives[0].id])),
  );
  const chosen = useMemo(
    () => risky.map((i) => ({ ingredient: i, alt: i.alternatives.find((a) => a.id === selected[i.id]) ?? i.alternatives[0] })),
    [risky, selected],
  );
  const shoppable = chosen.filter((c) => c.alt.conceptId && c.alt.products.length);

  const addAll = () => {
    const before = basketStore.snapshot();
    for (const { ingredient, alt } of shoppable) addSwap(recipe.id, ingredient, alt);
    toast.success(`Dodano u košaricu: ${shoppable.length}`, {
      action: { label: "Poništi", onClick: () => basketStore.restore(before) },
    });
  };

  if (recipe.status === "error") {
    return (
      <div className="mt-10 text-center">
        <h1 className="text-2xl font-bold text-cocoa-900">Veganizacija nije uspjela</h1>
        <Link href="/" className="mt-4 inline-flex h-11 items-center rounded-full bg-cocoa-900 px-5 text-sm font-bold text-oat-50">
          Pokušaj ponovno
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* header */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mint-600">
        {recipe.sourceUrl ? (
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-mint-800">
            {recipe.sourceName ?? "Izvor"} <ArrowUpRight className="size-3.5" />
          </a>
        ) : (
          <span>Tvoj recept</span>
        )}
        {recipe.dishCategory && <span className="text-cocoa-300">· {recipe.dishCategory}</span>}
      </div>
      <h1 className="mt-1 text-[2.1rem] font-bold leading-[1.02] text-cocoa-900 sm:text-5xl">{recipe.title}</h1>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat value={risky.length} label={risky.length === 1 ? "zamjena" : "zamjene"} tone="bg-mint-700 text-oat-50" />
        <Stat value={recipe.ingredients.length} label="sastojaka" tone="bg-oat-50 text-cocoa-900 ring-1 ring-cocoa-900/[0.06]" />
        <Stat value={recipe.servings ?? "–"} label="porcija" tone="bg-oat-50 text-cocoa-900 ring-1 ring-cocoa-900/[0.06]" />
      </div>

      <RecipeActions recipe={recipe} />

      {!risky.length && (
        <p className="mt-6 rounded-[20px] bg-mint-100 p-4 text-sm font-semibold text-mint-800">Ovaj recept je već veganski.</p>
      )}

      {/* swaps */}
      {risky.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold text-cocoa-900">Zamjene</h2>
          <div className="space-y-3">
            {risky.map((i) => (
              <SwapCard
                key={i.id}
                recipeId={recipe.id}
                ingredient={i}
                selectedId={selected[i.id]}
                onSelect={(id) => setSelected((s) => ({ ...s, [i.id]: id }))}
              />
            ))}
          </div>
        </section>
      )}

      {check.length > 0 && (
        <div className="mt-3 rounded-[20px] bg-honey-100 px-4 py-3 text-sm text-honey-700">
          <p className="font-bold">Provjeri deklaraciju</p>
          <p className="mt-0.5">{check.map((c) => c.name).join(", ")}</p>
        </div>
      )}

      {recipe.tip && (
        <p className="mt-3 flex gap-2.5 rounded-[20px] bg-oat-50 p-4 text-sm text-cocoa-700 ring-1 ring-cocoa-900/[0.06]">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-honey-700" /> {recipe.tip}
        </p>
      )}

      {/* ingredients */}
      <section className="mt-9">
        <h2 className="mb-3 text-xl font-bold text-cocoa-900">Sastojci</h2>
        <ul className="divide-y divide-cocoa-900/[0.05] rounded-[24px] bg-card px-4 ring-1 ring-cocoa-900/[0.06]">
          {recipe.ingredients.map((i) => {
            const swap = chosen.find((c) => c.ingredient.id === i.id);
            return (
              <li key={i.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[15px]">
                {swap ? (
                  <span className="min-w-0">
                    <span className="font-semibold text-mint-700">{swap.alt.label}</span>
                    <span className="ml-1.5 text-xs text-cocoa-300 line-through">{i.name}</span>
                  </span>
                ) : (
                  <span className={cn("min-w-0", i.status === "depends" ? "text-honey-700" : "text-cocoa-900")}>{i.raw}</span>
                )}
                {swap && <span className="tabular shrink-0 text-xs text-cocoa-400">{qty(swap.alt.requiredQty, swap.alt.requiredUnit)}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      {/* steps */}
      {recipe.steps.length > 0 && (
        <section className="mt-9">
          <h2 className="mb-3 text-xl font-bold text-cocoa-900">Postupak</h2>
          <ol className="space-y-2">
            {recipe.steps.map((s) => (
              <li
                key={s.n}
                className={cn("flex gap-3 rounded-[20px] p-4 text-[15px] leading-relaxed", s.changed ? "bg-mint-50 ring-1 ring-mint-200" : "bg-card ring-1 ring-cocoa-900/[0.06]")}
              >
                <span className={cn("font-heading text-lg font-bold leading-6", s.changed ? "text-mint-600" : "text-cocoa-300")}>{s.n}</span>
                <p className="text-cocoa-700">
                  {s.text_hr}
                  {s.changed && (
                    <span className="ml-2 inline-flex translate-y-[-1px] items-center gap-1 rounded-full bg-mint-600 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase text-oat-50">
                      <Sparkles className="size-2.5" /> vegansko
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.dishNotes && (
        <p className="mt-6 text-sm leading-relaxed text-cocoa-500">
          <span className="font-bold text-cocoa-700">Bilješka: </span>
          {recipe.dishNotes}
        </p>
      )}
      {recipe.sources.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {recipe.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-mint-700 underline-offset-2 hover:underline">
                {s.title ?? new URL(s.url).hostname}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* sticky add-all */}
      {shoppable.length > 0 && (
        <div className="fixed inset-x-3 bottom-[5.25rem] z-30 sm:inset-x-0 sm:bottom-5">
          <button
            type="button"
            onClick={addAll}
            className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 rounded-[22px] bg-mint-700 px-5 text-oat-50 shadow-lift transition-transform active:scale-[0.98] sm:mx-6 md:mx-auto"
          >
            <span className="flex items-center gap-2.5 font-bold">
              <ShoppingBasket className="size-5" /> Dodaj sve u košaricu
            </span>
            <span className="tabular rounded-full bg-mint-200 px-2.5 py-1 text-sm font-bold text-mint-800">{shoppable.length}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function RecipeActions({ recipe }: { recipe: RecipeView }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(Boolean(recipe.savedAt));
  const [busy, setBusy] = useState(false);
  const isSaved = saved && (!user || !recipe.ownerId || recipe.ownerId === user.id);

  const toggleSave = async () => {
    if (!user) {
      // finish the save automatically after the Google round-trip
      setPendingAction({ type: "save-recipe", recipeId: recipe.id });
      toast("Prijavi se da spremiš recept", { description: "Nakon prijave recept se sprema automatski." });
      await signInWithGoogle(`/recept/${recipe.id}`);
      return;
    }
    setBusy(true);
    const r = await setRecipeSaved(recipe.id, !isSaved);
    setBusy(false);
    if (r.ok) {
      setSaved(!isSaved);
      toast.success(isSaved ? "Uklonjeno iz spremljenih" : "Recept spremljen", { description: isSaved ? undefined : "Pronađi ga pod Recepti." });
    } else toast.error("Spremanje nije uspjelo");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link kopiran");
      }
    } catch {
      // user closed the share sheet
    }
  };

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={toggleSave}
        disabled={busy}
        className={cn(
          "flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors disabled:opacity-60",
          isSaved ? "bg-apricot-100 text-apricot-700" : "bg-oat-50 text-cocoa-900 ring-1 ring-cocoa-900/[0.08] hover:bg-white",
        )}
      >
        <Heart className={cn("size-4", isSaved && "fill-current")} />
        {isSaved ? "Spremljeno" : "Spremi"}
      </button>
      <button
        type="button"
        onClick={share}
        className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-oat-50 text-sm font-bold text-cocoa-900 ring-1 ring-cocoa-900/[0.08] transition-colors hover:bg-white"
      >
        <Share2 className="size-4" /> Podijeli
      </button>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div className={cn("rounded-[18px] px-3.5 py-3", tone)}>
      <p className="tabular font-heading text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{label}</p>
    </div>
  );
}

function SwapCard({
  recipeId,
  ingredient: i,
  selectedId,
  onSelect,
}: {
  recipeId: string;
  ingredient: IngredientView;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [why, setWhy] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const alt: AlternativeView = i.alternatives.find((a) => a.id === selectedId) ?? i.alternatives[0];
  const role = i.role ? ROLE_LABEL[i.role] : "";
  const need = qty(alt.requiredQty, alt.requiredUnit);

  return (
    <article className="overflow-hidden rounded-[24px] bg-card ring-1 ring-cocoa-900/[0.06]">
      <div className="px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={cn("rounded-full px-2 py-0.5 font-bold line-through decoration-2", i.status === "depends" ? "bg-honey-100 text-honey-700" : "bg-clay-100 text-clay-600")}>
            {i.name}
          </span>
          {role && <span className="rounded-full bg-oat-200 px-2 py-0.5 font-semibold text-cocoa-500">{role}</span>}
          {i.quantity != null && <span className="tabular text-cocoa-400">{qty(i.quantity, i.unit)}</span>}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h3 className="font-heading text-[1.4rem] font-bold leading-tight text-cocoa-900">
            <ArrowRight className="mb-1 mr-1 inline size-5 text-mint-500" />
            {alt.label}
          </h3>
          {need && alt.conceptId && <span className="tabular shrink-0 pb-1 text-xs font-semibold text-cocoa-400">treba {need}</span>}
        </div>

        {i.alternatives.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 scrollbar-none">
            {i.alternatives.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs font-bold transition-colors",
                  a.id === alt.id ? "bg-cocoa-900 text-oat-50" : "bg-oat-200/70 text-cocoa-500 hover:text-cocoa-900",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={() => setWhy((w) => !w)} className="mt-3 flex w-full items-start gap-1.5 text-left text-sm text-cocoa-500">
          <span className={cn(!why && "line-clamp-1")}>{alt.reasoning}</span>
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-cocoa-300 transition-transform", why && "rotate-180")} />
        </button>
      </div>

      {alt.conceptId && alt.products.length > 0 ? (
        <div className="border-t border-cocoa-900/[0.05] bg-oat-50/60 px-4 pb-3 pt-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-cocoa-400">
            <span className="inline-flex items-center gap-1">
              <Store className="size-3.5" /> {hr.search.count(alt.products.length)}
            </span>
            <span className="tabular normal-case tracking-normal">od {formatPrice(Math.min(...alt.products.map((p) => p.price)))}</span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {alt.products.slice(0, 3).map((p) => (
              <li key={p.itemId} className="flex items-center gap-2.5 text-[13px]">
                <ProductIcon group={p.conceptGroup} name={p.name} className="size-7 rounded-lg" iconClassName="size-3.5" />
                <span className="min-w-0 flex-1 truncate text-cocoa-700">{p.name}</span>
                <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} className="shrink-0" />
                <span className={cn("tabular w-14 shrink-0 text-right font-bold", p.isAkcija ? "text-apricot-700" : "text-cocoa-900")}>
                  {formatPrice(p.price)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              addSwap(recipeId, i, alt);
              setAdded(alt.id);
              toast.success(`${alt.label} u košarici`, { description: "Trgovinu biramo u košarici, prema načinu slaganja." });
            }}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors",
              added === alt.id ? "bg-mint-100 text-mint-700" : "bg-cocoa-900 text-oat-50 hover:bg-cocoa-700",
            )}
          >
            {added === alt.id ? <Check className="size-4" /> : <Plus className="size-4" />}
            {added === alt.id ? "U košarici" : `Dodaj: ${alt.label}`}
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 border-t border-cocoa-900/[0.05] bg-oat-50/60 px-4 py-3 text-xs font-semibold text-cocoa-500">
          <Home className="size-4 text-mint-600" /> Bez kupnje: najčešće već imaš kod kuće
        </p>
      )}
    </article>
  );
}
