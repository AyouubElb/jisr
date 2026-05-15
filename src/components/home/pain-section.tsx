import { MessageCircle, ClipboardCheck, NotebookPen } from "lucide-react";

const fieldNotes = [
  {
    when: "Mardi · 22 h 47",
    icon: MessageCircle,
    headline: "47 messages WhatsApp non lus.",
    sub: "Vous coupez votre série pour répondre. Encore.",
  },
  {
    when: "Dimanche · 6 h 12",
    icon: ClipboardCheck,
    headline: "23 copies à corriger avant lundi.",
    sub: "Café numéro 3. Stylo rouge presque vide.",
  },
] as const;

export function PainSection(): React.JSX.Element {
  return (
    <section className="relative -mt-12 bg-stone-100 pb-12 sm:-mt-16 sm:pb-16">
      <div aria-hidden className="h-12 sm:h-16" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Inner page — no card, no shadow, just a band of cream with edges */}
        <div className="relative rounded-2xl border border-border bg-card px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Le quotidien du prof
            </p>

            <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-amber-950 sm:text-4xl lg:text-5xl">
              Vous êtes{" "}
              <span className="relative inline-block">
                <span className="relative z-10">prof avant tout.</span>
                <MarkerUnderline className="absolute -bottom-2 left-0 w-full text-primary" />
              </span>
              <br />
              <span className="text-amber-950/70">
                Le reste — vous le faites parce qu&apos;il le faut.
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              Vous préparez, vous expliquez, vous accompagnez. Ça, c&apos;est
              votre métier. Tout ce qu&apos;il y a autour, ce ne devrait pas
              être votre problème.
            </p>
          </div>

          {/* ── Field notes ────────────────────────────────────── */}
          <div className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-2 lg:gap-8">
            {fieldNotes.map((note) => (
              <FieldNote key={note.when} {...note} />
            ))}

            {/* Big number — spans full width on lg, 2nd row */}
            <div className="md:col-span-2">
              <PrepTimeNote />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FieldNote({
  when,
  icon: Icon,
  headline,
  sub,
}: {
  when: string;
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  sub: string;
}): React.JSX.Element {
  return (
    <div className="group relative border-l-2 border-amber-950/15 pl-5 transition-colors hover:border-primary/60 sm:pl-6">
      {/* Tick mark */}
      <span
        aria-hidden
        className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-amber-950/30 transition-colors group-hover:bg-primary"
      />

      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {when}
      </p>

      <p className="mt-3 text-xl font-semibold leading-snug text-amber-950 sm:text-2xl">
        {headline}
      </p>

      <p className="mt-2 text-sm italic text-muted-foreground">{sub}</p>
    </div>
  );
}

function PrepTimeNote(): React.JSX.Element {
  return (
    <div className="relative mt-2 grid gap-6 border-l-2 border-amber-950/15 pl-5 sm:pl-6 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
      <span
        aria-hidden
        className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary"
      />

      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <NotebookPen className="h-3.5 w-3.5" />
          Tous les dimanches
        </p>

        <p className="-mb-2 mt-3 font-bold leading-none tracking-tight text-primary text-[88px] sm:text-[120px] lg:text-[160px]">
          5 h
        </p>
      </div>

      <div className="md:pb-4">
        <p className="text-xl font-semibold leading-snug text-amber-950 sm:text-2xl">
          partent dans la prépa avant la semaine.
        </p>
        <p className="mt-2 text-sm italic text-muted-foreground sm:text-base">
          PowerPoint, Word, Google Forms — un onglet par outil.
        </p>
      </div>
    </div>
  );
}

function MarkerUnderline({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 14"
      preserveAspectRatio="none"
      className={className}
    >
      <path
        d="M 4 7 Q 55 2, 110 7 T 216 6"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}
