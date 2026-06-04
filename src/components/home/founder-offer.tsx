import { Check, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const founderFeatures = [
  "Tarif bloqué à vie — aucune augmentation",
  "1 mois offert au lancement",
  "Tout le plan Pro (jusqu'à 30 élèves)",
  "Support WhatsApp direct avec le fondateur",
  "Influence directe sur la roadmap",
];

export function FounderOffer(): React.JSX.Element {
  return (
    <section id="fondateur" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            10 places fondateur. 99 DH/mois à vie.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Pour les 10 premiers instructeurs qui rejoignent Jisr — un tarif
            bloqué à vie, en échange d&apos;un retour produit régulier.
          </p>
        </div>

        <div className="mt-12">
          <div className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-6 shadow-md ring-4 ring-primary/15 lg:flex-row lg:items-stretch lg:gap-8 lg:p-8">
            <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Programme fondateur · 10 places
            </div>

            <div className="lg:flex-1 lg:border-r lg:border-border lg:pr-8">
              <h3 className="text-lg font-semibold text-amber-950">
                Pro Fondateur
              </h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-amber-950">99 DH</span>
                <span className="text-sm text-muted-foreground">/ mois</span>
                <span className="text-sm text-muted-foreground line-through">
                  200 DH
                </span>
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                1er mois offert
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Tarif fondateur réservé aux 10 premiers profs. Après ce cercle,
                le plan Pro passe au tarif standard (200 DH/mois).
              </p>
            </div>

            <div className="mt-6 lg:mt-0 lg:flex-1">
              <ul className="space-y-2.5">
                {founderFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-amber-950"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="#waitlist"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "mt-6 w-full",
                )}
              >
                Rejoindre la liste d&apos;attente
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
