import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SplashRemover } from "@/components/layout/splash-remover";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jisr — Enseignez plus, sans y laisser vos dimanches",
  description:
    "L'IA qui travaille avec les profs d'anglais marocains, pas à leur place. Correction, quiz, suivi d'élèves — Jisr s'occupe des heures perdues, vous gardez la pédagogie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html
      lang="fr"
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
