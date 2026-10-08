import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, Heart } from "lucide-react";
import { currentUserId, serverDb } from "@/lib/db/server";
import { GoogleSignInButton } from "@/components/auth/auth-button";
import { DeleteRecipeButton } from "@/components/recipe/delete-recipe-button";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Recepti" };

export default function RecipesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-2 sm:px-6 sm:pt-6">
      <h1 className="text-3xl font-bold text-cocoa-900">Recepti</h1>
      <Suspense fallback={<ListSkeleton />}>
        <MyRecipes />
      </Suspense>
    </main>
  );
}

async function MyRecipes() {
  const uid = await currentUserId();
  if (!uid) return <LoggedOut />;

  const db = await serverDb();
  const { data } = await db
    .from("recipes")
    .select("id, title, source_name, dish_category, created_at, saved_at, recipe_ingredients(status)")
    .eq("user_id", uid)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(60);
  const recipes = (data ?? []).map((r) => ({
    ...r,
    swaps: (r.recipe_ingredients as { status: string | null }[]).filter((i) => i.status && i.status !== "vegan").length,
  }));
  const saved = recipes.filter((r) => r.saved_at);

  if (!recipes.length) {
    return (
      <div className="mt-12 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-mint-100 text-mint-600">
          <BookOpen className="size-7" strokeWidth={1.6} />
        </span>
        <p className="mt-4 font-heading text-xl font-bold text-cocoa-900">Još nema recepata</p>
        <Link href="/" className="mt-4 inline-flex h-11 items-center rounded-full bg-cocoa-900 px-5 text-sm font-bold text-oat-50">
          Veganiziraj prvi recept
        </Link>
      </div>
    );
  }

  return (
    <>
      {saved.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-apricot-700">
            <Heart className="size-3.5 fill-current" /> Spremljeni
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {saved.map((r) => (
              <Link
                key={r.id}
                href={`/recept/${r.id}`}
                className="flex min-h-28 flex-col justify-between rounded-[20px] bg-mint-700 p-4 text-oat-50 transition-transform active:scale-[0.98]"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-mint-200">
                  {r.swaps} {plural(r.swaps, "zamjena", "zamjene", "zamjena")}
                </span>
                <span className="font-heading text-lg font-bold leading-tight">{r.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wider text-cocoa-400">Povijest</h2>
        <ul className="divide-y divide-cocoa-900/[0.05] rounded-[22px] bg-card ring-1 ring-cocoa-900/[0.06]">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-1 pl-4 pr-2">
              <Link href={`/recept/${r.id}`} className="min-w-0 flex-1 py-2.5">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-cocoa-900">
                  {r.saved_at && <Heart className="size-3.5 shrink-0 fill-apricot-500 text-apricot-500" />}
                  <span className="truncate">{r.title}</span>
                </p>
                <p className="mt-0.5 text-xs text-cocoa-400">
                  {[r.source_name, `${r.swaps} ${plural(r.swaps, "zamjena", "zamjene", "zamjena")}`, new Date(r.created_at).toLocaleDateString("hr-HR")]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
              <DeleteRecipeButton recipeId={r.id} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function LoggedOut() {
  return (
    <div className="mt-6 overflow-hidden rounded-[26px] bg-mint-700 p-6 text-oat-50">
      <p className="font-heading text-2xl font-bold leading-tight">Tvoji recepti, košarica i favoriti na svakom uređaju.</p>
      <GoogleSignInButton next="/recepti" className="mt-5 w-full" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="mt-5 space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-28 animate-pulse rounded-[20px] bg-oat-200" />
        <div className="h-28 animate-pulse rounded-[20px] bg-oat-200" />
      </div>
      <div className="h-48 animate-pulse rounded-[22px] bg-oat-50" />
    </div>
  );
}
