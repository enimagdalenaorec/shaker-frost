import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Grandstander, Nunito, Space_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { TabBar } from "@/components/tab-bar";
import { AuthSync } from "@/components/auth/auth-sync";
import "./globals.css";

import { Sprites } from "@/components/brand/sprites";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext"], display: "swap" });
const grandstander = Grandstander({ variable: "--font-grandstander", subsets: ["latin", "latin-ext"], weight: ["700", "800", "900"], display: "swap" });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin", "latin-ext"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "veganizir.ai", template: "%s · veganizir.ai" },
  description: "Veganske zamjene za svaki recept i najpovoljnija košarica u Zagrebu.",
};

export const viewport: Viewport = { themeColor: "#f4f0e8" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hr" className={`${nunito.variable} ${grandstander.variable} ${spaceMono.variable} h-full overflow-x-clip antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <Sprites />
        <SiteHeader />
        <div className="flex-1 pb-28 sm:pb-16">{children}</div>
        <Suspense fallback={null}>
          <TabBar />
        </Suspense>
        <Suspense fallback={null}>
          <AuthSync />
        </Suspense>
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
