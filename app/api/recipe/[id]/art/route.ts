import { adminDb } from "@/lib/db/admin";

/** The recipe's dish illustration, polled by the recipe page while it is being drawn (by recipe id, like the page). */
export async function GET(_request: Request, ctx: RouteContext<"/api/recipe/[id]/art">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ status: null, url: null }, { status: 404 });
  const { data } = await adminDb().from("recipes").select("art_status, art_url").eq("id", id).maybeSingle();
  return Response.json({ status: data?.art_status ?? null, url: data?.art_url ?? null }, { headers: { "cache-control": "no-store" } });
}
