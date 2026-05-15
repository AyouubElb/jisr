import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONTACT_WHATSAPP_URL } from "@/lib/constants/contact";

const plans = [
  {
    name: "Gratuit",
    price: "0 DH",
    period: "pour commencer",
    description: "Parfait pour tester la plateforme avec vos premiers élèves.",
    features: [
      "Jusqu'à 5 élèves",
      "Cours et leçons illimités",
      "Quiz de base",
      "Sessions en direct",
    ],
    cta: "Demander un accès",
    variant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "200 DH",
    period: "/ mois",
    description: "Pour les instructeurs actifs avec une vraie classe.",
    features: [
      "Jusqu'à 30 élèves",
      "Suivi d'engagement complet",
      "Quiz avancés et corrections",
      "Exports sans watermark",
      "Support prioritaire",
    ],
    cta: "Réserver un appel",
    variant: "default" as const,
    highlighted: true,
  },
  {
    name: "Studio",
    price: "349 DH",
    period: "/ mois",
    description: "Pour les freelances qui gèrent plusieurs cohortes.",
    features: [
      "Jusqu'à 150 élèves",
      "Analytics avancés",
      "Accès prioritaire aux nouveautés IA",
      "Support dédié",
    ],
    cta: "Réserver un appel",
    variant: "outline" as const,
    highlighted: false,
  },
];

export function PricingSection(): React.JSX.Element {
  return (
    <section id="tarifs" className="border-b border-border/60 bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            Des tarifs simples, en dirhams
          </h2>
          <p className="mt-4 text-muted-foreground">
            Programme fondateur : 1er mois gratuit puis 99 DH/mois à vie pour
            les 10 premiers profs (au lieu de 200 DH).
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-6 shadow-sm",
                plan.highlighted
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border",
              )}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-flex w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Recommandé
                </div>
              )}
              <h3 className="text-lg font-semibold text-amber-950">
                {plan.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-amber-950">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
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
                href={CONTACT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: plan.variant, size: "lg" }),
                  "mt-6 w-full",
                )}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Accès sur invitation après une discussion · Paiement par virement
          bancaire
        </p>
      </div>
    </section>
  );
}
