import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";
import { CONTACT_WHATSAPP_URL } from "@/lib/constants/contact";

export async function Hero(): Promise<React.JSX.Element> {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-amber-950 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("badge")}
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-amber-950 sm:text-5xl lg:text-6xl">
            {t("titleLine1")}
            <br />
            <span className="text-amber-950/70">{t("titleLine2")}</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SmoothScrollLink
              href="#waitlist"
              className={buttonVariants({ size: "lg" })}
            >
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </SmoothScrollLink>
            <a
              href={CONTACT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <MessageCircle className="h-4 w-4" />
              {t("ctaSecondary")}
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {t("ctaNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
