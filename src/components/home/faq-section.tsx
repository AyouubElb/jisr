"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Pourquoi je ne peux pas créer un compte directement ?",
    answer:
      "Jisr est en accès anticipé — on ouvre les comptes progressivement pour bien accompagner chaque prof. On prend 15 minutes (sur WhatsApp ou par téléphone, comme vous préférez) pour comprendre votre contexte, puis on vous envoie une invitation si Jisr vous correspond. Pas de chichi, pas de vente forcée.",
  },
  {
    question: "Comment ça fonctionne avec WhatsApp ?",
    answer:
      "Jisr complète WhatsApp, il ne le remplace pas. Gardez WhatsApp pour la communication rapide, utilisez Jisr pour les cours, quiz et suivi.",
  },
  {
    question: "Mes élèves actuels doivent-ils s'inscrire eux-mêmes ?",
    answer:
      "Non. Vous ajoutez manuellement vos élèves depuis votre tableau de bord. Ils reçoivent un accès sans avoir à chercher votre profil.",
  },
];

export function FaqSection(): React.JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-b border-border/60">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tout ce que vous voulez savoir avant de commencer.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className={cn(
                  "rounded-xl border bg-card shadow-sm transition-colors",
                  isOpen ? "border-primary/40" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-base font-semibold text-amber-950">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180 text-primary",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
