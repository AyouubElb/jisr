import {
  Bot,
  CheckCheck,
  MessageSquare,
  AlertCircle,
  Play,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    headline: "Décrivez un thème. Jisr génère le quiz",
    sub: "Questions, audios, corrigés — prêts en quelques secondes.",
  },
  {
    icon: CheckCheck,
    headline: "Les QCM se corrigent seuls",
    sub: "Les rédactions, on vous fait une première passe. Vous validez en 2 minutes.",
  },
  {
    icon: MessageSquare,
    headline: "Tout passe par Jisr",
    sub: "Messages, devoirs, ressources. Votre WhatsApp respire.",
  },
  {
    icon: AlertCircle,
    headline: "On vous prévient quand un élève décroche",
    sub: "14 jours sans connexion — vous le voyez avant lui.",
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
            <VideoPlaceholder />
          </div>

          {/* Features — spans 2 of 5 cols on lg */}
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card lg:col-span-2">
            {features.map((feature) => (
              <FeatureRow key={feature.headline} {...feature} />
            ))}
          </div>
        </div>

        {/* ── Footer line ────────────────────────────────────────── */}
        <p className="mt-12 max-w-3xl text-base text-muted-foreground sm:mt-16 sm:text-lg">
          Jisr fait le pont entre vous et vos élèves. Pas une plateforme de
          plus à apprendre —{" "}
          <em className="font-semibold not-italic text-amber-950">a shortcut</em>.
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
    <div className="group flex gap-4 p-5 transition-colors hover:bg-primary/5 sm:p-6">
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

/**
 * Placeholder for the demo video. Swap the inner content for a real
 * <video> element when the demo file is ready.
 *
 * Suggested swap:
 *   <video src="/demo/jisr-demo.mp4"
 *          poster="/demo/jisr-demo-poster.jpg"
 *          autoPlay muted loop playsInline preload="none"
 *          className="h-full w-full object-cover" />
 */
function VideoPlaceholder(): React.JSX.Element {
  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950 via-amber-900 to-stone-900 shadow-2xl shadow-amber-950/20 ring-1 ring-amber-950/10">
      {/* Decorative grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          color: "white",
        }}
      />

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

      {/* Center play element */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card/95 shadow-xl ring-1 ring-white/20 transition-transform group-hover:scale-105">
          <Play className="h-6 w-6 fill-primary text-primary" />
        </div>
        <p className="text-sm font-medium tracking-wide text-amber-50/90">
          Démo en préparation
        </p>
      </div>

      {/* Bottom-left pill */}
      <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-950 shadow-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        Démo · 28 sec
      </div>
    </div>
  );
}
