import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { getLocale } from "next-intl/server";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SplashRemover } from "@/components/layout/splash-remover";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Fallback for non-localized routes; localized pages override via generateMetadata.
export const metadata: Metadata = {
  title: {
    default: "Jisr",
    template: "%s · Jisr",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div id="app-splash" aria-hidden="true">
          <span className="splash-wordmark">
            Jisr<span className="accent">ج</span>
          </span>
        </div>
        <SplashRemover />
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
