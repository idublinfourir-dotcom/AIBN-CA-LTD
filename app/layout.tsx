import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import { SiteHeader } from "./components/site-header";
import { SiteFooter } from "./components/site-footer";
import { BackToTop } from "./components/back-to-top";
import { ChromeGate } from "./components/chrome-gate";
import { RouteProgress } from "./components/route-progress";
import { getSessionUser } from "./lib/supabase/guards";
import { site } from "./lib/content";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "AIBN Chartered Accountants Ltd | Audit, Tax & Business Advisory",
    template: "%s | AIBN Chartered Accountants Ltd",
  },
  description:
    "AIBN Chartered Accountants Ltd is a partner-led chartered accountancy practice. Audit, tax, bookkeeping, payroll and advisory for founders, family firms and growing teams.",
  openGraph: {
    siteName: "AIBN Chartered Accountants Ltd",
    type: "website",
    locale: "en_GB",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e2a33",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${archivo.variable} ${geistSans.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-canvas font-sans text-ink-body"
        suppressHydrationWarning
      >
        <RouteProgress />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-none focus:bg-navy-900 focus:px-5 focus:py-3 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <ChromeGate>
          <SiteHeader user={user} />
        </ChromeGate>
        <main id="main" className="flex-1">
          {children}
        </main>
        <ChromeGate>
          <SiteFooter />
          <BackToTop />
        </ChromeGate>
      </body>
    </html>
  );
}
