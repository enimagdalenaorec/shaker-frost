"use client";

import { useSyncExternalStore } from "react";
import type { Unit } from "./types";

// Guest basket + "Dodaj" history in localStorage (CLAUDE.md §5.4).
// Logged-in users get a DB adapter later; the UI talks to this store's API only.

export type LocalBasketItem = {
  id: string;
  kind: "product" | "concept";
  label: string;
  itemId?: string;
  conceptId?: string;
  facets?: Record<string, string>;
  requiredQty?: number | null;
  requiredUnit?: Unit | null;
  packages: number;
  pinnedItemId?: string | null;
  recipeId?: string;
  addedAt: number;
};

export type HistoryEntry = {
  kind: "product" | "concept";
  label: string;
  itemId?: string;
  conceptId?: string;
  facets?: Record<string, string>;
  source: "recipe" | "search" | "often";
  at: number;
};

type State = { items: LocalBasketItem[]; history: HistoryEntry[] };

const KEY = "veganizir.basket.v1";
const EMPTY: State = { items: [], history: [] };

let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? { ...EMPTY, ...(JSON.parse(raw) as State) } : EMPTY;
  } catch {
    state = EMPTY;
  }
  return state;
}

function save(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode / storage full: keep working in memory
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const keyOf = (e: { kind: string; itemId?: string; conceptId?: string; facets?: Record<string, string> }) =>
  e.kind === "product" ? `p:${e.itemId}` : `c:${e.conceptId}:${JSON.stringify(e.facets ?? {})}`;

export const basketStore = {
  snapshot: () => load(),

  add(item: Omit<LocalBasketItem, "id" | "addedAt" | "packages"> & { packages?: number }, source: HistoryEntry["source"]) {
    const s = load();
    const key = keyOf(item);
    const existing = s.items.find((i) => keyOf(i) === key);
    const items = existing
      ? s.items.map((i) =>
          i === existing
            ? item.kind === "product"
              ? { ...i, packages: i.packages + (item.packages ?? 1) }
              : { ...i, requiredQty: (i.requiredQty ?? 0) + (item.requiredQty ?? 0) }
            : i,
        )
      : [...s.items, { ...item, id: crypto.randomUUID(), packages: item.packages ?? 1, addedAt: Date.now() }];
    const entry: HistoryEntry = {
      kind: item.kind, label: item.label, itemId: item.itemId, conceptId: item.conceptId, facets: item.facets, source, at: Date.now(),
    };
    save({ items, history: [...s.history, entry].slice(-300) });
    return s; // previous state, for undo
  },

  setPackages(id: string, packages: number) {
    const s = load();
    save({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, packages: Math.max(1, packages) } : i)) });
  },

  pin(id: string, itemId: string | null) {
    const s = load();
    save({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, pinnedItemId: itemId } : i)) });
  },

  remove(id: string) {
    const s = load();
    save({ ...s, items: s.items.filter((i) => i.id !== id) });
  },

  restore(previous: State) {
    save(previous);
  },

  clear() {
    const s = load();
    save({ ...s, items: [] });
  },
};

const serverSnapshot = () => EMPTY;

export function useBasketState(): State {
  return useSyncExternalStore(subscribe, () => load(), serverSnapshot);
}

export function useBasketCount(): number {
  return useBasketState().items.length;
}

export type OftenEntry = { key: string; entry: HistoryEntry; times: number; lastAt: number };

/** History grouped by product/concept, most frequent first (mirrors the often_bought RPC). */
export function oftenBought(history: HistoryEntry[], limit = 8): OftenEntry[] {
  const groups = new Map<string, OftenEntry>();
  for (const h of history) {
    const key = keyOf(h);
    const g = groups.get(key);
    if (g) {
      g.times++;
      g.lastAt = Math.max(g.lastAt, h.at);
      g.entry = h;
    } else groups.set(key, { key, entry: h, times: 1, lastAt: h.at });
  }
  return [...groups.values()].sort((a, b) => b.times - a.times || b.lastAt - a.lastAt).slice(0, limit);
}
