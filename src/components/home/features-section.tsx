import {
  BookOpen,
  Sparkles,
  CheckCheck,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { VideoPlayer } from "@/components/home/video-player";

const features = [
  {
    icon: BookOpen,
    headline: "Vos cours. Organisés à votre façon.",
    sub: "Créez vos leçons, vos supports, vos parcours par niveau CEFR. Partagez avec vos élèves en un clic.",
  },
  {
    icon: Sparkles,
    headline: "L'IA prépare. Vous validez.",
    sub: "Leçons, quiz, passages audio avec leurs questions. Décrivez le thème, l'IA propose. Vous gardez la main.",
  },
  {
    icon: CheckCheck,
    headline: "Les corrections divisées par deux.",
    sub: "QCM corrigés seuls. Rédactions : l'IA fait la première passe, vous validez en 2 minutes.",
  },
  {
    icon: AlertCircle,
    headline: "Vos élèves. Suivis en continu.",
    sub: "Engagement, scores, ce qui décroche. Vous le voyez avant que l'élève parte.",
  },
  {
    icon: MessageSquare,
    headline: "Tout passe par Jisr.",
    sub: "Messages, devoirs, ressources, sessions live. Votre WhatsApp respire.",
  },
] as const;

export function FeaturesSection(): React.JSX.Element {
  return (
    <section id="fonctionnalites" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Les outils
          </p>

          <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-amber-950 sm:text-4xl lg:text-5xl">
            Tout ce qu&apos;il vous faut pour enseigner.{" "}
            <span className="text-amber-950/70">Rien de plus.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Les tâches répétitives, on s&apos;en occupe. Vos élèves, on les
            surveille. Vos cours, vous les construisez à votre façon.
          </p>
        </div>

        {/* ── Video + features grid ──────────────────────────────── */}
        <div className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-5 lg:gap-8">
          {/* Video — spans 3 of 5 cols on lg */}
          <div className="lg:col-span-3">
            <VideoPlayer />
          </div>

          {/* Features — spans 2 of 5 cols on lg */}
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card lg:col-span-2">
            {features.map((feature) => (
              <FeatureRow key={feature.headline} {...feature} />
            ))}
          </div>
        </div>

        {/* ── Footer line ────────────────────────────────────────── */}
        <p className="mt-12 max-w-4xl text-base text-muted-foreground sm:mt-16 sm:text-lg">
          Jisr fait le pont entre vous et vos élèves. Pas une plateforme de plus
          à apprendre.{" "}
          <em className="font-semibold not-italic text-amber-950">a shortcut</em>
          .
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

