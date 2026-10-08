"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteRecipe } from "@/app/actions/user";

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Obriši recept"
      disabled={pending}
      onClick={() => {
        if (confirm("Obrisati recept iz povijesti?")) start(() => deleteRecipe(recipeId));
      }}
      className="grid size-9 shrink-0 place-items-center rounded-full text-cocoa-300 transition-colors hover:bg-clay-100 hover:text-clay-600 disabled:opacity-40"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
