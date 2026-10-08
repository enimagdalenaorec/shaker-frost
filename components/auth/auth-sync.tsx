"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { claimRecipes, pullBasket, pushBasket, setRecipeSaved } from "@/app/actions/user";
import { takeLocalRecipes, takePendingAction, useAuth } from "@/lib/auth/client";
import { basketStore, type HistoryEntry, type LocalBasketItem } from "@/lib/basket/local-store";

const itemKey = (i: LocalBasketItem) => (i.kind === "product" ? `p:${i.itemId}` : `c:${i.conceptId}:${JSON.stringify(i.facets ?? {})}`);
const historyKey = (h: HistoryEntry) => `${h.kind}:${h.itemId ?? h.conceptId}:${h.at}`;

/**
 * Runs once per login: claims this device's guest recipes, finishes a pending "Spremi",
 * merges the local basket with the account's, then keeps the account copy in sync.
 */
export function AuthSync() {
  const { user } = useAuth();
  const router = useRouter();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      // 1. recipes made as a guest on this device
      const claimed = await claimRecipes(takeLocalRecipes());
      // 2. "Spremi" pressed before logging in
      const pending = takePendingAction();
      if (pending?.type === "save-recipe") {
        const r = await setRecipeSaved(pending.recipeId, true);
        if (r.ok) toast.success("Recept spremljen", { description: "Pronađi ga pod Recepti." });
      } else if (claimed) {
        toast.success(`${claimed} ${claimed === 1 ? "recept dodan" : "recepta dodano"} u tvoj račun`);
      }
      if (claimed || pending) router.refresh();

      // 3. merge baskets (local + account), then push the merged copy
      const remote = await pullBasket();
      const local = basketStore.snapshot();
      if (remote) {
        const items = [...remote.items];
        for (const li of local.items) if (!items.some((ri) => itemKey(ri) === itemKey(li))) items.push(li);
        const seen = new Set(remote.history.map(historyKey));
        const newHistory = local.history.filter((h) => !seen.has(historyKey(h)));
        const history = [...remote.history, ...newHistory].sort((a, b) => a.at - b.at).slice(-300);
        basketStore.restore({ items, history });
        await pushBasket(items, newHistory);
      }

      // 4. from now on, mirror every basket change to the account (debounced)
      let lastHistoryAt = Math.max(0, ...basketStore.snapshot().history.map((h) => h.at));
      let timer: ReturnType<typeof setTimeout> | undefined;
      unsubscribe = basketStore.subscribe(() => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const s = basketStore.snapshot();
          const fresh = s.history.filter((h) => h.at > lastHistoryAt);
          lastHistoryAt = Math.max(lastHistoryAt, ...fresh.map((h) => h.at));
          await pushBasket(s.items, fresh);
        }, 800);
      });
    })();

    return () => unsubscribe?.();
  }, [user, router]);

  return null;
}
