import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";

export function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-amber-950 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Assistant IA en développement — rejoignez la bêta
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-amber-950 sm:text-5xl lg:text-6xl">
            La plateforme des profs d&apos;anglais au Maroc
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Créez vos cours, organisez vos sessions en direct et suivez
            l&apos;engagement de vos élèves — dans un seul outil pensé pour
            vous.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonVariants({ size: "lg" })}
            >
              Essayer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <SmoothScrollLink
              href="#fonctionnalites"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Découvrir la plateforme
            </SmoothScrollLink>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Gratuit pour commencer · Aucune carte requise
          </p>
        </div>
      </div>
    </section>
  );
}
