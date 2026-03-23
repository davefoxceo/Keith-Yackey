import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Coach Keith AI — Become the Man She Can't Resist",
  description:
    "AI-powered relationship coaching for married men. Transform your marriage through Keith Yackey's proven Five Dials framework.",
  keywords: [
    "relationship coaching",
    "marriage coaching",
    "AI coach",
    "Keith Yackey",
    "five dials",
    "marriage help",
  ],
  openGraph: {
    title: "Coach Keith AI — Become the Man She Can't Resist",
    description:
      "AI-powered relationship coaching for married men. Transform your marriage.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-brand-navy text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
