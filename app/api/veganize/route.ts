import { after } from "next/server";
import { z } from "zod";
import { runPipeline, type PipelineEvent } from "@/lib/ai/pipeline";
import { currentUserId } from "@/lib/db/server";

// LLM extraction for non-coolinarika/index sites makes long runs ~35 s; 120 s leaves room on a slow model day
export const maxDuration = 120;

const Body = z
  .object({
    url: z.string().url().optional(),
    text: z.string().min(30).max(20_000).optional(),
    example: z.string().regex(/^[a-z-]+$/).optional(),
    excludeTags: z.array(z.string()).max(10).optional(),
  })
  .refine((b) => b.url || b.text || b.example, { message: "Nedostaje recept" });

/**
 * Runs the pipeline and streams every stage as Server-Sent Events. The dish illustration it starts
 * keeps drawing after the stream has closed (after(), within maxDuration); the recipe page polls for it.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Neispravan zahtjev" }, { status: 400 });

  const userId = await currentUserId();
  const background: Promise<unknown>[] = [];
  after(() => Promise.all(background));
  const encoder = new TextEncoder();
  // the step rewrite runs after the stream closes, so the result page opens ~5 s sooner
  let deferred: (() => Promise<void>) | null = null;
  after(async () => {
    await deferred?.();
  });
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PipelineEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      await runPipeline(
        { ...parsed.data, userId, defer: (task) => (deferred = task), background: (task) => background.push(task) },
        send,
      );
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
