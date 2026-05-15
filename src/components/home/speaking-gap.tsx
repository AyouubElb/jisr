import { Headphones } from "lucide-react";

const SCALE_MIN = 400;
const SCALE_MAX = 600;

const skills = [
  { label: "Lecture", value: 532, highlighted: false },
  { label: "Expression", value: 491, highlighted: false },
  { label: "Écriture", value: 491, highlighted: false },
  { label: "Compréhension", value: 460, highlighted: true },
] as const;

export function SpeakingGap(): React.JSX.Element {
  return (
    <section className="border-b border-border/60 bg-card/40">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          {/* ── Chart ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Score d&apos;anglais des Marocains
            </p>

            <div className="mt-6 space-y-4">
              {skills.map((skill) => (
                <Bar
                  key={skill.label}
                  label={skill.label}
                  value={skill.value}
                  highlighted={skill.highlighted}
                />
              ))}
            </div>

            {/* Axis */}
            <div className="mt-2 flex items-center gap-4">
              <span className="w-[120px] shrink-0" />
              <div className="flex flex-1 justify-between text-[10px] font-medium text-muted-foreground tabular-nums">
                <span>{SCALE_MIN}</span>
                <span>500</span>
                <span>{SCALE_MAX}</span>
              </div>
              <span className="w-10 shrink-0" />
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Source :{" "}
              <a
                href="https://www.ef.com/wwen/epi/regions/africa/morocco/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-950 underline-offset-2 hover:underline"
              >
                EF English Proficiency Index 2025
              </a>{" "}
              — 116 pays testés, 2,3 millions de candidats.
            </p>
          </div>

          {/* ── Copy ──────────────────────────────────────────────── */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <Headphones className="h-3.5 w-3.5" />
              L&apos;écart à combler
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
              Les Marocains lisent bien l&apos;anglais. Ils ne savent pas encore l&apos;écouter.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Un écart de 72 points entre la lecture et la compréhension
              orale — documenté par l&apos;EF English Proficiency Index 2025.
              C&apos;est l&apos;opportunité de chaque prof d&apos;anglais au
              Maroc.
            </p>
            <p className="mt-3 text-sm font-medium text-amber-950">
              Jisr est conçu autour de cet écart. Quiz d&apos;écoute avec audio
              généré par IA, corrections orales, exercices de communication —
              tout pousse vers l&apos;oral.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bar({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: number;
  highlighted: boolean;
}): React.JSX.Element {
  const pct = Math.max(
    0,
    Math.min(100, ((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100),
  );

  return (
    <div className="flex items-center gap-4">
      <span
        className={`w-[120px] shrink-0 text-sm font-medium ${
          highlighted ? "text-amber-950" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>

      <div className="relative flex-1">
        <div className="h-5 w-full overflow-hidden rounded-full bg-muted/70">
          <div
            className={`h-full rounded-full ${
              highlighted ? "bg-primary" : "bg-amber-950/35"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <span
        className={`w-10 shrink-0 text-right text-sm font-semibold tabular-nums ${
          highlighted ? "text-primary" : "text-amber-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
