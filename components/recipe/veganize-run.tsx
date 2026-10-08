"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { PENDING_TEXT_KEY } from "@/components/smart-input";
import { EXAMPLE_RECIPES } from "@/lib/examples";
import { rememberLocalRecipe } from "@/lib/auth/client";
import { Character } from "@/components/brand/sprites";
import type { PipelineEvent, StageName } from "@/lib/ai/pipeline";

const STAGES: { id: StageName; label: string }[] = [
  { id: "ingest", label: "Čitam recept" },
  { id: "analyze", label: "Tražim neveganske sastojke" },
  { id: "research", label: "Istražujem zamjene" },
  { id: "alternatives", label: "Biram najbolje zamjene" },
  { id: "offers", label: "Tražim proizvode" },
  { id: "rewrite", label: "Prepisujem korake" },
];

type StageState = { status: "waiting" | "running" | "done" | "error"; ms?: number; summary?: string; detail?: unknown };
type AnalyzeDetail = { ingredients: { index: number; name: string; status: string }[] };
type AltDetail = { items: { name?: string; alternatives: { label: string }[] }[] };
type IngestDetail = { title: string; source: string | null };

export function VeganizeRun() {
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const [stages, setStages] = useState<Record<string, StageState>>({});
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);

  const url = params.get("url");
  const example = params.get("primjer");
  const exampleLabel = EXAMPLE_RECIPES.find((r) => r.slug === example)?.label;

  useEffect(() => {
    if (started.current) return; // React dev mode runs effects twice; the pipeline must run once
    started.current = true;
    const text = params.get("izvor") === "tekst" ? sessionStorage.getItem(PENDING_TEXT_KEY) : null;
    const body = example ? { example } : url ? { url } : text ? { text } : null;
    if (!body) {
      setError("Nema recepta. Zalijepi link ili tekst na početnoj.");
      setRunning(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/veganize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!res.body) throw new Error("Nema odgovora");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.replace(/^data: /, "");
            if (!line) continue;
            const e = JSON.parse(line) as PipelineEvent;
            if (e.type === "stage") {
              setStages((s) => ({
                ...s,
                [e.stage]: e.status === "start" ? { status: "running" } : { status: "done", ms: e.ms, summary: e.summary, detail: e.detail },
              }));
            } else if (e.type === "done") {
              rememberLocalRecipe(e.recipeId);
              router.replace(`/recept/${e.recipeId}`);
            } else if (e.type === "error") {
              if (e.stage) setStages((s) => ({ ...s, [e.stage!]: { status: "error" } }));
              setError(e.message);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Veza je prekinuta.");
      } finally {
        setRunning(false);
      }
    })();
  }, [example, params, router, url]);

  // elapsed-time counter, independent of the (run-once) pipeline effect
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(timer);
  }, [running]);

  const ingest = stages.ingest?.detail as IngestDetail | undefined;
  const title = ingest?.title ?? exampleLabel ?? (url ? new URL(url).hostname.replace(/^www\./, "") : "Tvoj recept");

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="micro font-bold text-rind">{ingest?.source ?? "Veganiziram"}</p>
          <h1 className="mt-1.5 text-[2.4rem] leading-[0.95] text-ink">{title}</h1>
        </div>
        <span className={cn("tabular mt-1 shrink-0 rounded-full border-[1.5px] border-ink px-2.5 py-1 font-heading text-sm font-black text-ink", running ? "bg-ochre" : "bg-paper")}>
          {elapsed} s
        </span>
      </div>

      {running && (
        <div className="mt-5 flex items-center gap-3">
          <Character id="carrot" className="character bob w-10" />
          <span className="micro font-bold text-rind">njušim, mijenjam, objašnjavam…</span>
        </div>
      )}

      <ol className="card-ink mt-4 overflow-hidden">
        {STAGES.map((st, i) => {
          const s = stages[st.id] ?? { status: "waiting" };
          return (
            <li key={st.id} className={cn("relative px-4 py-3.5", i > 0 && "border-t border-ink/15")}>
              <div className="flex items-center gap-3">
                <StageDot status={s.status} />
                <span className={cn("flex-1 text-[15px] font-extrabold", s.status === "waiting" ? "text-ink/35" : "text-ink")}>{st.label}</span>
                {s.status === "done" && <span className="micro tabular text-rind">{(s.ms! / 1000).toFixed(1)} s</span>}
              </div>
              {s.status === "done" && (
                <div className="ml-9 mt-1">
                  <p className="text-sm font-semibold text-rind">{s.summary}</p>
                  <StageDetail stage={st.id} detail={s.detail} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mt-4 rounded-[20px] border-[1.5px] border-ink bg-guava-light p-4">
          <p className="flex items-start gap-2 text-sm font-extrabold text-ink">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {friendly(error)}
          </p>
          <Link href="/" className="btn btn-paper mt-3 h-10 px-4 text-sm">
            Pokušaj ponovno <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function StageDot({ status }: { status: StageState["status"] }) {
  if (status === "done")
    return (
      <span className="grid size-6 place-items-center rounded-full border-[1.5px] border-ink bg-pistachio text-ink">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (status === "running")
    return (
      <span className="relative grid size-6 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-guava/50" />
        <span className="size-3 rounded-full border-[1.5px] border-ink bg-guava" />
      </span>
    );
  if (status === "error") return <span className="grid size-6 place-items-center rounded-full bg-clay-600 text-white">!</span>;
  return <span className="size-6 rounded-full border-2 border-dashed border-ink/25" />;
}

function StageDetail({ stage, detail }: { stage: StageName; detail: unknown }) {
  if (stage === "analyze") {
    const d = detail as AnalyzeDetail | undefined;
    const risky = d?.ingredients.filter((i) => i.status !== "vegan") ?? [];
    if (!risky.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {risky.map((i) => (
          <span key={i.index} className={cn("rounded-full border-[1.5px] border-ink px-2.5 py-0.5 text-xs font-extrabold text-ink", i.status === "depends" ? "bg-ochre-light" : "bg-guava-light")}>
            {i.name}
          </span>
        ))}
      </div>
    );
  }
  if (stage === "alternatives") {
    const d = detail as AltDetail | undefined;
    return (
      <ul className="mt-2 space-y-1">
        {d?.items.map((it, n) => (
          <li key={n} className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink/45 line-through">{it.name}</span>
            <ArrowRight className="size-3.5 text-guava-deep" />
            <span className="font-extrabold text-ink">{it.alternatives[0]?.label}</span>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

function friendly(message: string) {
  if (/zauzeti|nedostupni|429|503/.test(message)) return "AI je trenutno preopterećen. Pokušaj za minutu.";
  return message;
}
