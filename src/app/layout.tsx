import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RYMX",
  description: "RYMX — Cairo-based clothing brand",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
