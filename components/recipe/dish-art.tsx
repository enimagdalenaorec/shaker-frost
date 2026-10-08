"use client";

import { useEffect, useState } from "react";
import { Brush } from "lucide-react";
import { cn } from "@/lib/utils";

const POLL_MS = 2500;
const GIVE_UP_AFTER = 30; // polls (~75 s): the drawing runs within the veganize route's 60 s limit

/**
 * The dish illustration next to the recipe title. While the image model is still drawing it shows a soft
 * placeholder and polls for the picture, then pops it in. Renders nothing when there is no picture.
 */
export function DishArt({
  recipeId,
  title,
  initialUrl,
  initialStatus,
  className,
}: {
  recipeId: string;
  title: string;
  initialUrl: string | null;
  initialStatus: "pending" | "done" | null;
  className?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [waiting, setWaiting] = useState(initialStatus === "pending");

  useEffect(() => {
    if (!waiting) return;
    let polls = 0;
    const timer = setInterval(async () => {
      polls++;
      const art = (await fetch(`/api/recipe/${recipeId}/art`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null)) as { status: string | null; url: string | null } | null;
      if (art?.status === "done" && art.url) {
        // load it before showing, so the pop-in animation plays on the finished picture
        const img = new Image();
        img.src = art.url;
        await img.decode().catch(() => {});
        setUrl(art.url);
        setWaiting(false);
      } else if (art?.status === "error" || polls >= GIVE_UP_AFTER) {
        setWaiting(false);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [recipeId, waiting]);

  if (!url && !waiting) return null;

  return (
    <div className={cn("relative size-32 shrink-0 sm:size-44", className)}>
      {!url && (
        <div className="blob blob-round blob-fill-pistachio-pale absolute inset-5 grid animate-pulse place-items-center text-rind" role="status">
          <span className="flex flex-col items-center gap-1">
            <Brush className="size-5 -rotate-12" />
            <span className="micro">crtam…</span>
          </span>
        </div>
      )}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Ilustracija: ${title}`}
          className="character pop-in size-full object-contain"
        />
      )}
    </div>
  );
}
