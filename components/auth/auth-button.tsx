"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { signInWithGoogle, signOut, useAuth } from "@/lib/auth/client";

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export function GoogleSignInButton({ next, className, label = "Prijava s Googleom" }: { next?: string; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        signInWithGoogle(next).catch(() => setBusy(false));
      }}
      className={cn(
        "btn btn-paper h-12 px-5 text-[15px]",
        className,
      )}
    >
      <GoogleMark className="size-4" />
      {label}
    </button>
  );
}

/** Header: "Prijava" for guests, the Google avatar with a small menu for users. */
export function AuthButton() {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!ready) return <span className="size-9 animate-pulse rounded-full bg-oat-200" />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="btn btn-ink h-9 px-3.5 text-[13px] shadow-[0_3px_0_rgb(64_52_66/0.35)] hover:shadow-[0_4px_0_rgb(64_52_66/0.35)]"
      >
        <GoogleMark className="size-3.5" />
        Prijava
      </button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Račun"
        className="grid size-9 place-items-center overflow-hidden rounded-full border-2 border-ink bg-pistachio text-xs font-black text-ink"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div className="card-ink absolute right-0 top-12 z-50 w-56 overflow-hidden !rounded-[20px]">
          <div className="border-b border-cocoa-900/[0.06] px-4 py-3">
            <p className="truncate text-sm font-bold text-cocoa-900">{user.name}</p>
            {user.email && <p className="truncate text-xs text-cocoa-400">{user.email}</p>}
          </div>
          <Link href="/recepti" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-cocoa-700 hover:bg-oat-100">
            <BookOpen className="size-4" /> Moji recepti
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.refresh();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-clay-600 hover:bg-clay-100"
          >
            <LogOut className="size-4" /> Odjava
          </button>
        </div>
      )}
    </div>
  );
}
