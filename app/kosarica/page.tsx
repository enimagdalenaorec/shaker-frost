import type { Metadata } from "next";
import { Basket } from "@/components/basket/basket";

export const metadata: Metadata = { title: "Košarica" };

export default function BasketPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6 sm:pt-6">
      <Basket />
    </main>
  );
}
