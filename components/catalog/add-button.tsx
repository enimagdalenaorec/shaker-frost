"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { basketStore, type HistoryEntry } from "@/lib/basket/local-store";
import { hr } from "@/lib/i18n/hr";
import type { ProductSummary } from "@/lib/catalog/types";

export function useAddProduct() {
  return (p: Pick<ProductSummary, "itemId" | "name">, source: HistoryEntry["source"], packages = 1) => {
    const previous = basketStore.add({ kind: "product", itemId: p.itemId, label: p.name, packages }, source);
    toast.success(hr.product.added, {
      description: p.name,
      action: { label: hr.product.undo, onClick: () => basketStore.restore(previous) },
    });
  };
}

/** Round "+" for cards, or a labelled pill for rows. Briefly shows a check after adding. */
export function AddButton({
  product,
  source,
  variant = "round",
  className,
}: {
  product: Pick<ProductSummary, "itemId" | "name">;
  source: HistoryEntry["source"];
  variant?: "round" | "pill";
  className?: string;
}) {
  const add = useAddProduct();
  const [done, setDone] = useState(false);

  const onClick = () => {
    add(product, source);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "btn h-9 px-4 text-sm",
          done ? "btn-pistachio" : "btn-guava",
          className,
        )}
      >
        {done ? <Check className="size-4" /> : <Plus className="size-4" />}
        {hr.product.add}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${hr.product.add}: ${product.name}`}
      className={cn(
        "btn blob-round size-9 shrink-0",
        done ? "btn-pistachio" : "btn-guava",
        className,
      )}
    >
      {done ? <Check className="size-4" /> : <Plus className="size-4" />}
    </button>
  );
}
