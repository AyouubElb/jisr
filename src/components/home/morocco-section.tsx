import { MapPin, Coins, GraduationCap } from "lucide-react";

const pillars = [
  {
    icon: MapPin,
    title: "Au Maroc",
    description:
      "Conçu, testé et utilisé au Maroc — pas adapté depuis ailleurs.",
  },
  {
    icon: Coins,
    title: "En dirhams",
    description: "Tarifs locaux, paiement par virement. Pas de carte étrangère.",
  },
  {
    icon: GraduationCap,
    title: "Pour le bac, IELTS & TOEFL",
    description:
      "Niveaux CEFR (A1 → C2) alignés sur les examens que vos élèves passent vraiment.",
  },
] as const;

export function MoroccoSection(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-amber-50/30">
      {/* Soften top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent"
      />

      {/* Top-left corner zellij */}
      <ZellijCorner
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-20 h-[480px] w-[480px] origin-top-left"
      />
      {/* Bottom-right corner zellij (rotated 180°) */}
      <ZellijCorner
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-20 h-[480px] w-[480px] origin-bottom-right rotate-180"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Fait au Maroc
          </p>

          <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-amber-950 sm:text-4xl lg:text-5xl">
            La première plateforme marocaine{" "}
            <span className="text-amber-950/70">
              conçue pour les profs d&apos;anglais.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Tarifs en dirhams. Interface française. Niveaux CEFR adaptés au
            bac, IELTS et TOEFL. Construit avec les profs d&apos;ici, pas
            adapté depuis ailleurs.
          </p>
        </div>

        {/* ── 3 pillars ──────────────────────────────────────────── */}
        <div className="mt-12 grid gap-0 divide-y rounded-2xl border border-border bg-card shadow-sm sm:mt-16 md:grid-cols-3 md:divide-x md:divide-y-0">
          {pillars.map((pillar) => (
            <Pillar key={pillar.title} {...pillar} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillar({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 p-6 sm:p-8">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-base font-semibold text-amber-950 sm:text-lg">
        {title}
      </p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// Zellij corner: interlocking 8-point stars + pentagons, radial fade from the corner.
function ZellijCorner({
  className,
  ...rest
}: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  const SIZE = 50;
  const HALF = SIZE / 2;
  const R_OUT = SIZE * 0.47;
  // Khatem sulayman ratio (≈ tan(67.5°)⁻¹): inner radius for crisp 8-point star
  const R_IN = R_OUT * 0.414;

  const starPoints = (cx: number, cy: number): string => {
    const pts: string[] = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? R_OUT : R_IN;
      const angle = -Math.PI / 2 + (i * Math.PI) / 8;
      pts.push(
        `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`,
      );
    }
    return pts.join(" ");
  };

  // Pentagon fills negative space between two adjacent stars (top edge).
  const pentTop =
    `${HALF - R_IN * 0.7},${R_IN * 0.5} ${HALF + R_IN * 0.7},${R_IN * 0.5} ` +
    `${HALF + R_IN * 1.2},${HALF - R_IN * 0.6} ` +
    `${HALF},${HALF - R_IN * 0.1} ` +
    `${HALF - R_IN * 1.2},${HALF - R_IN * 0.6}`;

  const CANVAS = SIZE * 9;
  return (
    <svg
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      preserveAspectRatio="xMinYMin slice"
      className={className}
      style={{
        maskImage:
          "radial-gradient(circle at 0% 0%, black 0%, black 38%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(circle at 0% 0%, black 0%, black 38%, transparent 75%)",
      }}
      {...rest}
    >
      <defs>
        <pattern
          id="zellij-tile"
          x="0"
          y="0"
          width={SIZE}
          height={SIZE}
          patternUnits="userSpaceOnUse"
        >
          <polygon points={pentTop} fill="oklch(0.45 0.09 60)" fillOpacity="0.28" />
          <polygon points={pentTop} fill="oklch(0.45 0.09 60)" fillOpacity="0.28" transform={`rotate(90 ${HALF} ${HALF})`} />
          <polygon points={pentTop} fill="oklch(0.45 0.09 60)" fillOpacity="0.28" transform={`rotate(180 ${HALF} ${HALF})`} />
          <polygon points={pentTop} fill="oklch(0.45 0.09 60)" fillOpacity="0.28" transform={`rotate(270 ${HALF} ${HALF})`} />
          <polygon points={starPoints(0, 0)} fill="currentColor" className="text-primary" fillOpacity="0.55" />
          <polygon points={starPoints(SIZE, 0)} fill="currentColor" className="text-primary" fillOpacity="0.55" />
          <polygon points={starPoints(0, SIZE)} fill="currentColor" className="text-primary" fillOpacity="0.55" />
          <polygon points={starPoints(SIZE, SIZE)} fill="currentColor" className="text-primary" fillOpacity="0.55" />
        </pattern>
      </defs>
      <rect width={CANVAS} height={CANVAS} fill="url(#zellij-tile)" />
    </svg>
  );
}
