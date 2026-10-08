import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "veganizir.ai: svaki recept može biti veganski", template: "%s · veganizir.ai" },
  description:
    "Zalijepi link recepta: veganizir.ai pronalazi neveganske sastojke, predlaže zamjene i slaže najpovoljniju košaricu u trgovinama u Zagrebu.",
};

export const viewport: Viewport = { themeColor: "#f7f3ec" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hr" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
