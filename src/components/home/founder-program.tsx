import { Crown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CONTACT_WHATSAPP_URL } from "@/lib/constants/contact";

const benefits = [
  "99 DH/mois à vie — jamais d'augmentation",
  "Onboarding personnalisé — on migre votre première classe avec vous",
  "Vous façonnez le produit — vos demandes passent en priorité",
  "Accès direct au fondateur sur WhatsApp",
];

export function FounderProgram(): React.JSX.Element {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl border-2 border-primary/30 bg-card p-8 shadow-lg sm:p-12">
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-5 w-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Programme fondateur
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            10 profs. Pas plus.
          </h2>

          <p className="mt-4 max-w-2xl text-muted-foreground">
            On lance Jisr avec 10 profs d&apos;anglais marocains choisis pour
            bien démarrer. Si vous êtes retenu·e, vous obtenez un tarif
            fondateur à vie et une voix directe sur le produit.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-sm text-amber-950"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>

          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "mt-8")}
          >
            Postuler au programme fondateur →
          </a>

          <p className="mt-3 text-xs text-muted-foreground">
            15 min sur WhatsApp ou par téléphone · Réponse sous 48h
          </p>
        </div>
      </div>
    </section>
  );
}
