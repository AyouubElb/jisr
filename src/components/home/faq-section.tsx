"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function FaqSection(): React.JSX.Element {
  const t = useTranslations("home.faq");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { question: t("q1Question"), answer: t("q1Answer") },
    { question: t("q2Question"), answer: t("q2Answer") },
    { question: t("q3Question"), answer: t("q3Answer") },
  ];

  return (
    <section id="faq" className="border-b border-border/60">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
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
