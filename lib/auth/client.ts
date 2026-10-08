"use client";

import { useSyncExternalStore } from "react";
import { browserDb } from "@/lib/db/browser";

// Client-side auth state (Google via Supabase). One listener for the whole app.

export type AppUser = { id: string; name: string; email: string | null; avatarUrl: string | null };
type AuthState = { user: AppUser | null; ready: boolean };

let state: AuthState = { user: null, ready: false };
let started = false;
const listeners = new Set<() => void>();
const SERVER: AuthState = { user: null, ready: false };

function set(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function toUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): AppUser | null {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  return {
    id: u.id,
    name: String(m.full_name ?? m.name ?? u.email ?? "Korisnik"),
    email: u.email ?? null,
    avatarUrl: (m.avatar_url as string | undefined) ?? (m.picture as string | undefined) ?? null,
  };
}

function start() {
  if (started) return;
  started = true;
  const auth = browserDb().auth;
  auth.getSession().then(({ data }) => set({ user: toUser(data.session?.user), ready: true }));
  auth.onAuthStateChange((_event, session) => set({ user: toUser(session?.user), ready: true }));
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

export async function signInWithGoogle(nextPath?: string) {
  const next = nextPath ?? `${window.location.pathname}${window.location.search}`;
  await browserDb().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
}

export async function signOut() {
  await browserDb().auth.signOut();
}

// ── an action to finish after the Google round-trip (e.g. "Spremi" pressed as a guest) ──────────
const PENDING_KEY = "veganizir.pendingAction";
export type PendingAction = { type: "save-recipe"; recipeId: string };

export function setPendingAction(a: PendingAction) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(a));
  } catch {}
}

export function takePendingAction(): PendingAction | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingAction) : null;
  } catch {
    return null;
  }
}

// ── recipes veganized on this device before logging in: claimed into the account at login ───────
const LOCAL_RECIPES_KEY = "veganizir.localRecipes";

export function rememberLocalRecipe(id: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(LOCAL_RECIPES_KEY) ?? "[]") as string[];
    if (!ids.includes(id)) localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify([...ids, id].slice(-50)));
  } catch {}
}

export function takeLocalRecipes(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(LOCAL_RECIPES_KEY) ?? "[]") as string[];
    localStorage.removeItem(LOCAL_RECIPES_KEY);
    return ids;
  } catch {
    return [];
  }
}
