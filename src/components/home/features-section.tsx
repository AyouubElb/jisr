import {
  BookOpen,
  Sparkles,
  CheckCheck,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { VideoPlayer } from "@/components/home/video-player";

export async function FeaturesSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("home.features");

  const features = [
    { icon: BookOpen, headline: t("f1Headline"), sub: t("f1Sub") },
    { icon: Sparkles, headline: t("f2Headline"), sub: t("f2Sub") },
    { icon: CheckCheck, headline: t("f3Headline"), sub: t("f3Sub") },
    { icon: AlertCircle, headline: t("f4Headline"), sub: t("f4Sub") },
    { icon: MessageSquare, headline: t("f5Headline"), sub: t("f5Sub") },
  ] as const;

  return (
    <section id="fonctionnalites" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("eyebrow")}
          </p>

          <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-amber-950 sm:text-4xl lg:text-5xl">
            {t("titleLead")}{" "}
            <span className="text-amber-950/70">{t("titleTail")}</span>
          </h2>

          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("lede")}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-3">
            <VideoPlayer />
          </div>

          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card lg:col-span-2">
            {features.map((feature) => (
              <FeatureRow key={feature.headline} {...feature} />
            ))}
          </div>
        </div>

        <p className="mt-12 max-w-4xl text-base text-muted-foreground sm:mt-16 sm:text-lg">
          {t("footerLead")}{" "}
          <em className="font-semibold not-italic text-amber-950">
            {t("footerEmphasis")}
          </em>
          {t("footerTail")}
        </p>
      </div>
    </section>
  );
}

function FeatureRow({
  icon: Icon,
  headline,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  sub: string;
}): React.JSX.Element {
  return (
    <div className="group flex flex-1 gap-4 p-5 transition-colors hover:bg-primary/5 sm:p-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-amber-950 sm:text-base">
          {headline}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
