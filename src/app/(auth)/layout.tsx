import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side: Branded cream panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-stone-100 p-12">
        {/* Decorative oversized Arabic watermark */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-8 select-none text-[20rem] font-bold leading-none text-amber-950/[0.04]"
          style={{ fontFamily: "serif" }}
        >
          جسر
        </span>

        {/* Logo */}
        <Link
          href="/"
          aria-label="Retour à l'accueil Jisr"
          className="relative z-10 inline-flex w-fit items-baseline gap-0.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span className="text-2xl font-bold tracking-tight text-amber-950">
            Jisr
          </span>
          <span
            aria-hidden
            className="text-lg font-semibold text-primary"
            style={{ lineHeight: 1 }}
          >
            ج
          </span>
        </Link>

        {/* Main content */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-amber-950">
              L&apos;espace de travail
              <br />
              du prof d&apos;anglais.
            </h2>
            <p className="max-w-md text-base text-amber-950/70">
              Vos cours, vos élèves, vos quiz, votre suivi — au même endroit.
            </p>
          </div>

          {/* Feature highlights with left-rail tick mark */}
          <div className="space-y-5">
            <Bullet>Quiz générés en quelques secondes — audio compris.</Bullet>
            <Bullet>Corrections automatiques. Vous validez en 2 minutes.</Bullet>
            <Bullet>Alerte quand un élève décroche.</Bullet>
          </div>
        </div>

        {/* Footer note */}
        <div className="relative z-10 text-sm text-amber-950/60">
          Étudiant ? Connectez-vous — votre instructeur vous a inscrit.
        </div>
      </div>

      {/* Right side: Auth form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo (only shown on small screens) */}
          <Link
            href="/"
            aria-label="Retour à l'accueil Jisr"
            className="mb-8 flex items-baseline justify-center gap-0.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
          >
            <span className="text-2xl font-bold tracking-tight text-amber-950">
              Jisr
            </span>
            <span
              aria-hidden
              className="text-lg font-semibold text-primary"
              style={{ lineHeight: 1 }}
            >
              ج
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="relative border-l-2 border-amber-950/15 pl-4">
      <span
        aria-hidden
        className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary"
      />
      <p className="text-sm font-medium text-amber-950 sm:text-base">
        {children}
      </p>
    </div>
  );
}
