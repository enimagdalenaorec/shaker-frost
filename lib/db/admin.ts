import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Service-role client: bypasses RLS. Server code only (pipeline writes, guest recipes by id). */
export function adminDb() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
