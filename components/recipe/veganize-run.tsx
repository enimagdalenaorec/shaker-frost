"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { PENDING_TEXT_KEY } from "@/components/smart-input";
import { EXAMPLE_RECIPES } from "@/lib/examples";
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
          <p className="text-xs font-bold uppercase tracking-wider text-mint-600">{ingest?.source ?? "Veganiziram"}</p>
          <h1 className="mt-1 text-[2rem] font-bold leading-[1.05] text-cocoa-900">{title}</h1>
        </div>
        <span className={cn("tabular mt-1 shrink-0 rounded-full px-2.5 py-1 font-heading text-sm font-bold", running ? "bg-mint-100 text-mint-700" : "bg-oat-200 text-cocoa-500")}>
          {elapsed} s
        </span>
      </div>

      <ol className="mt-6 overflow-hidden rounded-[24px] bg-card ring-1 ring-cocoa-900/[0.06]">
        {STAGES.map((st, i) => {
          const s = stages[st.id] ?? { status: "waiting" };
          return (
            <li key={st.id} className={cn("relative px-4 py-3.5", i > 0 && "border-t border-cocoa-900/[0.05]")}>
              <div className="flex items-center gap-3">
                <StageDot status={s.status} />
                <span className={cn("flex-1 text-[15px] font-semibold", s.status === "waiting" ? "text-cocoa-300" : "text-cocoa-900")}>{st.label}</span>
                {s.status === "done" && <span className="tabular text-[11px] text-cocoa-400">{(s.ms! / 1000).toFixed(1)} s</span>}
              </div>
              {s.status === "done" && (
                <div className="ml-9 mt-1">
                  <p className="text-sm text-cocoa-500">{s.summary}</p>
                  <StageDetail stage={st.id} detail={s.detail} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mt-4 rounded-[20px] bg-clay-100 p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-clay-600">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {friendly(error)}
          </p>
          <Link href="/" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-cocoa-900">
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
      <span className="grid size-6 place-items-center rounded-full bg-mint-600 text-oat-50">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (status === "running")
    return (
      <span className="relative grid size-6 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-mint-300/70" />
        <span className="size-3 rounded-full bg-mint-500" />
      </span>
    );
  if (status === "error") return <span className="grid size-6 place-items-center rounded-full bg-clay-600 text-white">!</span>;
  return <span className="size-6 rounded-full border-2 border-dashed border-oat-300" />;
}

function StageDetail({ stage, detail }: { stage: StageName; detail: unknown }) {
  if (stage === "analyze") {
    const d = detail as AnalyzeDetail | undefined;
    const risky = d?.ingredients.filter((i) => i.status !== "vegan") ?? [];
    if (!risky.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {risky.map((i) => (
          <span key={i.index} className={cn("rounded-full px-2.5 py-1 text-xs font-bold", i.status === "depends" ? "bg-honey-100 text-honey-700" : "bg-clay-100 text-clay-600")}>
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
            <span className="text-cocoa-400 line-through decoration-clay-600/50">{it.name}</span>
            <ArrowRight className="size-3.5 text-mint-500" />
            <span className="font-semibold text-mint-700">{it.alternatives[0]?.label}</span>
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
