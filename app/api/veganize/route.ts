import { z } from "zod";
import { runPipeline, type PipelineEvent } from "@/lib/ai/pipeline";

export const maxDuration = 90;

const Body = z
  .object({
    url: z.string().url().optional(),
    text: z.string().min(30).max(20_000).optional(),
    example: z.string().regex(/^[a-z-]+$/).optional(),
    excludeTags: z.array(z.string()).max(10).optional(),
  })
  .refine((b) => b.url || b.text || b.example, { message: "Nedostaje recept" });

/** Runs the pipeline and streams every stage as Server-Sent Events. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Neispravan zahtjev" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PipelineEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      await runPipeline(parsed.data, send);
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
