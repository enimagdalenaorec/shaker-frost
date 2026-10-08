import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { TabBar } from "@/components/tab-bar";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin", "latin-ext"], display: "swap" });
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "veganizir.ai", template: "%s · veganizir.ai" },
  description: "Veganske zamjene za svaki recept i najpovoljnija košarica u Zagrebu.",
};

export const viewport: Viewport = { themeColor: "#f7f3ec" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hr" className={`${figtree.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1 pb-28 sm:pb-16">{children}</div>
        <TabBar />
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
