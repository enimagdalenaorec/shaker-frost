import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Heart, Leaf } from "lucide-react";
import { Character } from "@/components/brand/sprites";
import { currentUserId, serverDb } from "@/lib/db/server";
import { GoogleSignInButton } from "@/components/auth/auth-button";
import { DeleteRecipeButton } from "@/components/recipe/delete-recipe-button";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Recepti" };

export default function RecipesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-2 sm:px-6 sm:pt-6">
      <h1 className="title-bar text-[2.6rem] leading-none text-ink">Recepti</h1>
      <Suspense fallback={<ListSkeleton />}>
        <MyRecipes />
      </Suspense>
    </main>
  );
}

async function MyRecipes() {
  // per-user and time-dependent (the auth token expiry check reads the clock): render at request time
  await connection();
  const uid = await currentUserId();
  if (!uid) return <LoggedOut />;

  const db = await serverDb();
  const { data } = await db
    .from("recipes")
    .select("id, title, source_name, dish_category, created_at, saved_at, art_url, recipe_ingredients(status)")
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
        <Character id="avocado" className="character bob mx-auto w-20" />
        <p className="mt-4 font-heading text-2xl font-black text-ink">Još nema recepata</p>
        <Link href="/" className="btn btn-guava mt-4 h-12 px-5">
          Veganiziraj prvi recept
        </Link>
      </div>
    );
  }

  return (
    <>
      {saved.length > 0 && (
        <section className="mt-5">
          <h2 className="micro mb-2.5 flex items-center gap-1.5 font-bold text-guava-deep">
            <Heart className="size-3.5 fill-current" /> Spremljeni
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {saved.map((r) => (
              <Link
                key={r.id}
                href={`/recept/${r.id}`}
                className="pebble relative flex min-h-32 flex-col justify-between bg-pistachio p-4 text-ink shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:-rotate-[0.5deg] hover:shadow-lift"
              >
                {r.art_url && <DishThumb url={r.art_url} className="absolute -right-2 -top-4 size-24 rotate-6" />}
                <span className="micro font-bold text-ink/70">
                  {r.swaps} {plural(r.swaps, "zamjena", "zamjene", "zamjena")}
                </span>
                <span className="font-heading text-xl font-black leading-tight">{r.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <h2 className="micro mb-2.5 font-bold text-rind">Povijest</h2>
        <ul className="grid gap-2.5">
          {recipes.map((r, n) => (
            <li key={r.id} className="pebble-sm flex items-center gap-2 bg-paper py-1 pl-2 pr-2 shadow-soft">
              <Link href={`/recept/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-1">
                <DishThumb url={r.art_url} className={cn("size-14", n % 2 ? "rotate-3" : "-rotate-3")} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-[16px] font-extrabold text-ink">
                    {r.saved_at && <Heart className="size-3.5 shrink-0 fill-apricot-500 text-apricot-500" />}
                    <span className="truncate">{r.title}</span>
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-rind">
                    {[r.source_name, `${r.swaps} ${plural(r.swaps, "zamjena", "zamjene", "zamjena")}`, new Date(r.created_at).toLocaleDateString("hr-HR")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
              <DeleteRecipeButton recipeId={r.id} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** The dish illustration as a small sticker; a soft leaf blob for recipes drawn before illustrations existed. */
function DishThumb({ url, className }: { url: string | null; className?: string }) {
  if (!url)
    return (
      <span className={cn("blob blob-round blob-fill-pistachio-pale grid shrink-0 scale-[0.8] place-items-center text-rind", className)} aria-hidden>
        <Leaf className="size-5" />
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" loading="lazy" className={cn("character shrink-0 object-contain", className)} />;
}

function LoggedOut() {
  return (
    <div className="pebble-lg relative mt-6 bg-blush p-6">
      <Character id="carrot" className="character absolute -top-8 right-5 w-12 rotate-12" />
      <p className="font-heading text-[1.7rem] font-black leading-tight text-ink">Tvoji recepti, košarica i favoriti na svakom uređaju.</p>
      <GoogleSignInButton next="/recepti" className="blob-pill mt-5 w-full blob-fill-white hover:blob-fill-pistachio-light" />
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
