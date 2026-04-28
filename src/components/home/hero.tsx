import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";
import { CONTACT_WHATSAPP_URL } from "@/lib/constants/contact";

export function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-amber-950 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Programme fondateur · 10 places ouvertes
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-amber-950 sm:text-5xl lg:text-6xl">
            Vos élèves. Vos revenus. Vos outils.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Jisr est la boîte à outils du prof d&apos;anglais moderne.
            Enseignez en direct, sans intermédiaire, avec des outils d&apos;IA
            qui s&apos;occupent du travail répétitif.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={CONTACT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "lg" })}
            >
              Discutons de votre cas
              <ArrowRight className="h-4 w-4" />
            </a>
            <SmoothScrollLink
              href="#fonctionnalites"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Voir comment ça marche
            </SmoothScrollLink>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Sur invitation après une discussion · 99 DH/mois à vie pour les 10 premiers profs
          </p>
        </div>
      </div>
    </section>
  );
}
