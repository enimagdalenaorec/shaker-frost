import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RecipeResult } from "@/components/recipe/recipe-result";
import { loadRecipe } from "@/lib/recipe/load";

export const metadata: Metadata = { title: "Veganski recept" };

export default function RecipePage({ params }: PageProps<"/recept/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-2 sm:px-6 sm:pt-6">
      <Suspense fallback={<ResultSkeleton />}>
        <Recipe params={params} />
      </Suspense>
    </main>
  );
}

async function Recipe({ params }: { params: PageProps<"/recept/[id]">["params"] }) {
  const { id } = await params;
  const recipe = await loadRecipe(id);
  if (!recipe) notFound();
  return <RecipeResult recipe={recipe} />;
}

function ResultSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-24 animate-pulse rounded bg-oat-200" />
      <div className="h-9 w-3/4 animate-pulse rounded-lg bg-oat-200" />
      <div className="mt-6 h-48 animate-pulse rounded-[24px] bg-oat-50" />
      <div className="h-48 animate-pulse rounded-[24px] bg-oat-50" />
    </div>
  );
}
