import type { Metadata } from "next";
import { Suspense } from "react";
import { VeganizeRun } from "@/components/recipe/veganize-run";

export const metadata: Metadata = { title: "Veganiziram…" };

export default function NewRecipePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-2 sm:px-6 sm:pt-6">
      <Suspense>
        <VeganizeRun />
      </Suspense>
    </main>
  );
}
