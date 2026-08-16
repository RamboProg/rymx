import type { Metadata } from "next";
import { Archivo, Big_Shoulders, JetBrains_Mono, Syne } from "next/font/google";
import { PixelScripts } from "@/components/analytics/PixelScripts";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HideOnLanding } from "@/components/layout/HideOnLanding";
import { CartProvider } from "@/modules/cart/components/CartProvider";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
});

const bigShouldersDisplay = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-big-shoulders",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "RYMX — Cairo / SS26",
  description: "RYMX — Cairo-based clothing brand. Reveal your mistakes.",
  openGraph: {
    title: "RYMX — Cairo / SS26",
    description: "RYMX — Cairo-based clothing brand. Reveal your mistakes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${syne.variable} ${archivo.variable} ${bigShouldersDisplay.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-svh flex-col font-sans">
        <PixelScripts />
        <CartProvider>
          <AnnouncementBar />
          <HideOnLanding>
            <Header />
          </HideOnLanding>
          <main className="flex flex-1 flex-col">{children}</main>
          <HideOnLanding>
            <Footer />
          </HideOnLanding>
        </CartProvider>
      </body>
    </html>
  );
}
