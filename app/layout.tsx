import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  // Avoids a layout shift when the webfont swaps in.
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "RED Atlas Dashboard",
  description: "Internal business metrics dashboard for RED Atlas",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  // Internal tool: never index it. Reinforced by public/robots.txt and the
  // X-Robots-Tag header set in next.config.mjs.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 0,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} overflow-hidden`}>{children}</body>
    </html>
  );
}
