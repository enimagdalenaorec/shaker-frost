import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

// Temporary: replaced by the streaming AI pipeline (P3).
export default function NewRecipePage({ searchParams }: PageProps<"/recept/novi">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-16 text-center sm:px-6">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-100 text-mint-600">
        <Sparkles className="size-6" />
      </span>
      <h1 className="mt-5 text-3xl font-normal text-cocoa-900">Veganizacija recepta stiže uskoro</h1>
      <Suspense>
        <Source searchParams={searchParams} />
      </Suspense>
      <Link href="/" className="mt-8 inline-block rounded-full bg-cocoa-900 px-4 py-2.5 text-sm font-medium text-oat-50">
        Natrag na početnu
      </Link>
    </main>
  );
}

async function Source({ searchParams }: { searchParams: PageProps<"/recept/novi">["searchParams"] }) {
  const p = await searchParams;
  const what = typeof p.url === "string" ? p.url : typeof p.primjer === "string" ? `primjer: ${p.primjer}` : "zalijepljeni tekst";
  return <p className="mt-3 break-all text-sm text-cocoa-500">{what}</p>;
}
