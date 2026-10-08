"use client";

import { ArrowRight, Link2, Loader2, Search, Sparkles, Text } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";

type Mode = "empty" | "recipe-url" | "recipe-text" | "search";

const DOMAIN_PATH = /^([\w-]+\.)+[a-z]{2,}\/\S+$/i;

export function detectMode(value: string): Mode {
  const t = value.trim();
  if (!t) return "empty";
  if (/^https?:\/\//i.test(t) || (!/\s/.test(t) && DOMAIN_PATH.test(t))) return "recipe-url";
  if (t.includes("\n") || t.length > 140) return "recipe-text";
  return "search";
}

export const PENDING_TEXT_KEY = "veganizir.pendingRecipeText";

/**
 * One field for everything: a recipe link or pasted recipe → Veganiziraj, a short query → Traži.
 * The button label follows what was typed, so no hint text is needed.
 */
export function SmartInput({
  defaultValue = "",
  variant = "hero",
  live = false,
  autoFocus = false,
  className,
}: {
  defaultValue?: string;
  variant?: "hero" | "compact";
  /** On the search page: update results while typing. */
  live?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const mode = detectMode(value);
  const isRecipe = mode === "recipe-url" || mode === "recipe-text";
  const hero = variant === "hero";

  // follow the URL (e.g. a suggestion link) unless the user is typing right now
  useEffect(() => {
    if (document.activeElement !== ref.current) setValue(defaultValue);
  }, [defaultValue]);

  // auto-grow for pasted recipes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

  // live search with a small debounce
  useEffect(() => {
    if (!live || mode !== "search" || value.trim() === defaultValue.trim()) return;
    const id = setTimeout(() => {
      startTransition(() => router.replace(`/trazi?q=${encodeURIComponent(value.trim())}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(id);
  }, [value, live, mode, defaultValue, router]);

  const submit = () => {
    const t = value.trim();
    if (!t) return ref.current?.focus();
    startTransition(() => {
      if (mode === "recipe-url") {
        router.push(`/recept/novi?url=${encodeURIComponent(/^https?:\/\//i.test(t) ? t : `https://${t}`)}`);
      } else if (mode === "recipe-text") {
        try {
          sessionStorage.setItem(PENDING_TEXT_KEY, t);
        } catch {}
        router.push("/recept/novi?izvor=tekst");
      } else {
        router.push(`/trazi?q=${encodeURIComponent(t)}`);
      }
    });
  };

  const LeadIcon = mode === "recipe-url" ? Link2 : mode === "recipe-text" ? Text : Search;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "flex items-end gap-1.5 bg-oat-50 transition-shadow",
        hero ? "rounded-[20px] p-1.5" : "rounded-2xl p-1 ring-1 ring-cocoa-900/[0.08] focus-within:ring-2 focus-within:ring-mint-300",
        className,
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-[14px] transition-colors",
          hero ? "size-12" : "size-10",
          isRecipe ? "bg-mint-600 text-oat-50" : "text-cocoa-400",
        )}
        aria-hidden
      >
        <LeadIcon className="size-5" />
      </span>
      <label className="sr-only" htmlFor={`smart-${variant}`}>
        {hr.smartInput.placeholder}
      </label>
      <textarea
        id={`smart-${variant}`}
        ref={ref}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={hero ? hr.smartInput.placeholder : hr.smartInput.placeholderShort}
        className={cn(
          "min-w-0 flex-1 resize-none bg-transparent font-medium text-cocoa-900 outline-none placeholder:font-normal placeholder:text-cocoa-400",
          hero ? "py-3.5 text-base" : "py-2.5 text-[15px]",
        )}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        aria-label={isRecipe ? hr.smartInput.veganize : hr.smartInput.search}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[14px] font-semibold transition-all active:scale-95",
          hero ? "h-12 min-w-12" : "h-10 min-w-10",
          isRecipe ? "bg-mint-600 px-4 text-oat-50 hover:bg-mint-700" : "bg-cocoa-900 text-oat-50 hover:bg-cocoa-700",
        )}
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : isRecipe ? <Sparkles className="size-4" /> : <ArrowRight className="size-5" />}
        {isRecipe && <span className="text-sm">{hr.smartInput.veganize}</span>}
      </button>
    </form>
  );
}
