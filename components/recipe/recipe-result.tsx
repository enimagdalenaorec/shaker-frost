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
import { DishArt } from "./dish-art";
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
        <h1 className="text-3xl text-ink">Veganizacija nije uspjela</h1>
        <Link href="/" className="btn btn-guava mt-4 h-12 px-5">
          Pokušaj ponovno
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* header */}
      <div className="micro flex items-center gap-2 font-bold text-rind">
        {recipe.sourceUrl ? (
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-ink">
            {recipe.sourceName ?? "Izvor"} <ArrowUpRight className="size-3.5" />
          </a>
        ) : (
          <span>Tvoj recept</span>
        )}
        {recipe.dishCategory && <span className="text-ink/40">· {recipe.dishCategory}</span>}
      </div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="mt-1.5 min-w-0 text-[2.6rem] leading-[0.95] text-ink sm:text-6xl">{recipe.title}</h1>
        <DishArt recipeId={recipe.id} title={recipe.title} initialUrl={recipe.artUrl} initialStatus={recipe.artStatus} className="-mt-6 -mr-2 sm:-mt-10" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat value={risky.length} label={risky.length === 1 ? "zamjena" : "zamjene"} tone="bg-pistachio" />
        <Stat value={recipe.ingredients.length} label="sastojaka" tone="bg-paper shadow-soft" />
        <Stat value={recipe.servings ?? "–"} label="porcija" tone="bg-paper shadow-soft" />
      </div>

      <RecipeActions recipe={recipe} />

      {!risky.length && (
        <p className="pebble mt-6 bg-pistachio p-4 text-sm font-extrabold text-ink">Ovaj recept je već veganski.</p>
      )}

      {/* swaps */}
      {risky.length > 0 && (
        <section className="mt-8">
          <h2 className="title-bar mb-4 text-3xl text-ink">Zamjene</h2>
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
        <div className="pebble mt-3 bg-ochre-light px-4 py-3 text-sm text-ink">
          <p className="font-black">Provjeri deklaraciju</p>
          <p className="mt-0.5">{check.map((c) => c.name).join(", ")}</p>
        </div>
      )}

      {recipe.tip && (
        <p className="pebble mt-3 flex gap-2.5 bg-ochre p-4 text-sm font-bold text-ink">
          <Lightbulb className="mt-0.5 size-4 shrink-0" /> {recipe.tip}
        </p>
      )}

      {/* ingredients */}
      <section className="mt-9">
        <h2 className="title-bar mb-4 text-3xl text-ink">Sastojci</h2>
        <ul className="grid gap-1.5">
          {recipe.ingredients.map((i) => {
            const swap = chosen.find((c) => c.ingredient.id === i.id);
            return (
              <li key={i.id} className={cn("pebble-sm flex items-baseline justify-between gap-3 px-4 py-2.5 text-[15px] font-semibold", swap ? "bg-pistachio-pale" : "bg-paper")}>
                {swap ? (
                  <span className="min-w-0">
                    <span className="font-extrabold text-ink">{swap.alt.label}</span>
                    <span className="ml-1.5 text-xs text-ink/45 line-through">{i.name}</span>
                  </span>
                ) : (
                  <span className={cn("min-w-0", i.status === "depends" ? "text-honey-700" : "text-ink")}>{i.raw}</span>
                )}
                {swap && <span className="tabular shrink-0 text-xs font-bold text-rind">{qty(swap.alt.requiredQty, swap.alt.requiredUnit)}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      {/* steps */}
      {recipe.steps.length > 0 && (
        <section className="mt-9">
          <h2 className="title-bar mb-4 text-3xl text-ink">Postupak</h2>
          <ol className="space-y-2">
            {recipe.steps.map((s) => (
              <li
                key={s.n}
                className={cn("pebble flex gap-3 p-4 text-[15px] leading-relaxed", s.changed ? "bg-pistachio-pale" : "bg-paper")}
              >
                <span className={cn("blob blob-round grid size-7 shrink-0 place-items-center font-heading text-sm font-black text-ink", s.changed ? "blob-fill-guava" : "blob-fill-oat-200")}>{s.n}</span>
                <p className="font-semibold text-ink">
                  {s.text_hr}
                  {s.changed && (
                    <span className="blob role-tag ml-2 inline-flex translate-y-[-1px] items-center gap-1 align-middle">
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
        <p className="mt-6 text-sm font-semibold italic leading-relaxed text-rind">
          <span className="font-black not-italic text-ink">Bilješka: </span>
          {recipe.dishNotes}
        </p>
      )}
      {recipe.sources.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {recipe.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="font-bold text-ink underline-offset-2 hover:underline">
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
            className="btn btn-guava blob-pill blob-float mx-auto flex h-14 w-full max-w-2xl justify-between pl-7 pr-5 sm:mx-6 sm:blob-long md:mx-auto"
          >
            <span className="flex items-center gap-2.5 font-black">
              <ShoppingBasket className="size-5" /> Dodaj sve u košaricu
            </span>
            <span className="blob blob-round blob-fill-ink tabular grid size-8 place-items-center text-sm font-black text-cream">{shoppable.length}</span>
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
          "btn h-11 text-sm sm:blob-pill",
          isSaved ? "btn-guava" : "btn-paper",
        )}
      >
        <Heart className={cn("size-4", isSaved && "fill-current")} />
        {isSaved ? "Spremljeno" : "Spremi"}
      </button>
      <button
        type="button"
        onClick={share}
        className="btn btn-paper h-11 text-sm sm:blob-pill"
      >
        <Share2 className="size-4" /> Podijeli
      </button>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div className={cn("pebble px-4 py-3", tone)}>
      <p className="tabular font-heading text-[2rem] font-black leading-none text-guava-deep">{value}</p>
      <p className="mt-1 text-xs font-extrabold text-ink">{label}</p>
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
    <article className="pebble overflow-hidden bg-paper shadow-soft">
      <div className="px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={cn("blob px-2.5 py-0.5 font-extrabold text-ink line-through decoration-2", i.status === "depends" ? "blob-fill-ochre-light" : "blob-fill-guava-light")}>
            {i.name}
          </span>
          {role && <span className="blob role-tag">{role}</span>}
          {i.quantity != null && <span className="tabular font-bold text-rind">{qty(i.quantity, i.unit)}</span>}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h3 className="font-heading text-[1.6rem] font-black leading-tight text-ink">
            <ArrowRight className="mb-1 mr-1 inline size-5 text-guava-deep" />
            {alt.label}
          </h3>
          {need && alt.conceptId && <span className="micro tabular shrink-0 pb-1 font-bold text-rind">treba {need}</span>}
        </div>

        {i.alternatives.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 scrollbar-none">
            {i.alternatives.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className={cn(
                  "blob h-8 shrink-0 px-3.5 text-xs font-bold transition-colors",
                  a.id === alt.id ? "blob-fill-ink text-oat-50" : "blob-fill-oat-200 text-cocoa-500 hover:text-cocoa-900",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={() => setWhy((w) => !w)} className="mt-3 flex w-full items-start gap-1.5 text-left text-sm font-semibold text-rind">
          <span className={cn(!why && "line-clamp-1")}>{alt.reasoning}</span>
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-ink/40 transition-transform", why && "rotate-180")} />
        </button>
      </div>

      {alt.conceptId && alt.products.length > 0 ? (
        <div className="bg-oat-200/45 px-4 pb-4 pt-3">
          <div className="micro flex items-center justify-between font-bold text-rind">
            <span className="inline-flex items-center gap-1">
              <Store className="size-3.5" /> {hr.search.count(alt.products.length)}
            </span>
            <span className="tabular normal-case tracking-normal">od {formatPrice(Math.min(...alt.products.map((p) => p.price)))}</span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {alt.products.slice(0, 3).map((p) => (
              <li key={p.itemId} className="flex items-center gap-2.5 text-[13px]">
                <ChainBadge code={p.chainCode} name={p.chainName} kind={p.chainKind} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.name}</span>
                <span className={cn("tabular w-14 shrink-0 text-right font-heading text-[15px] font-black", p.isAkcija ? "text-guava-deep" : "text-ink")}>
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
              "btn blob-pill mt-3 h-11 w-full text-sm sm:blob-long",
              added === alt.id ? "btn-pistachio" : "btn-guava",
            )}
          >
            {added === alt.id ? <Check className="size-4" /> : <Plus className="size-4" />}
            {added === alt.id ? "U košarici" : `Dodaj: ${alt.label}`}
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 bg-oat-200/45 px-4 py-3 text-xs font-bold text-rind">
          <Home className="size-4 text-ink" /> Bez kupnje: najčešće već imaš kod kuće
        </p>
      )}
    </article>
  );
}
