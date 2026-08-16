import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Archivo, Big_Shoulders, Cairo, JetBrains_Mono, Syne } from "next/font/google";
import { PixelScripts } from "@/components/analytics/PixelScripts";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HideOnLanding } from "@/components/layout/HideOnLanding";
import { ToastProvider } from "@/components/ui/Toast";
import { CartProvider } from "@/modules/cart/components/CartProvider";
import { dirForLocale, type Locale } from "@/i18n/locale";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";

// Arabic-capable font, applied site-wide only when the locale is Arabic (the
// display/body fonts below are latin-only). Same font used by the admin area.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = dirForLocale(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`h-full antialiased ${syne.variable} ${archivo.variable} ${bigShouldersDisplay.variable} ${jetbrainsMono.variable} ${cairo.variable}`}
      style={locale === "ar" ? { fontFamily: "var(--font-cairo)" } : undefined}
    >
      <body className="flex min-h-svh flex-col font-sans">
        <PixelScripts />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>
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
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
