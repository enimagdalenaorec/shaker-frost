import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/** Per-request Supabase client acting as the logged-in user (RLS applies). Reads the auth cookies. */
export async function serverDb() {
  const cookieStore = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component: proxy.ts refreshes the session instead
        }
      },
    },
  });
}

/** The verified user id (JWT checked via getClaims), or null for guests. */
export async function currentUserId(): Promise<string | null> {
  const db = await serverDb();
  const { data } = await db.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}
