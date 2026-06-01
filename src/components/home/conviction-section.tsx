import Image from "next/image";

export function ConvictionSection(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden border-y border-amber-950/10 bg-stone-100">
      {/* Paper grain across the whole section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #451a03 1px, transparent 1px), radial-gradient(circle at 70% 60%, #451a03 1px, transparent 1px)",
          backgroundSize: "32px 32px, 48px 48px",
        }}
      />

      {/* Soft warm wash on the right — anchors the sticky illustration zone */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] bg-gradient-to-l from-amber-100/40 via-amber-50/15 to-transparent lg:block"
      />

      {/* Eyebrow band */}
      <div className="relative mx-auto max-w-6xl px-6 pt-16 sm:px-8 sm:pt-20 lg:pt-24">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-amber-950/30" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-950/60">
            Notre conviction
          </span>
          <span aria-hidden className="h-px flex-1 bg-amber-950/15" />
          <span
            aria-hidden
            className="hidden font-serif text-xs italic text-amber-950/45 md:inline"
          >
            III · le pont
          </span>
        </div>
      </div>

      {/* Two-column: scrolling prose left, sticky illustration right.
          Grid uses `items-start` so each column finds its natural height —
          required for `position: sticky` on the right column to actually stick. */}
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16 lg:pb-28 lg:pt-16">
        {/* ── PROSE COLUMN (left) ─────────────────────────────────── */}
        <div className="order-2 lg:order-1">
          <div className="max-w-xl space-y-6 text-lg leading-relaxed text-amber-950/85 sm:text-xl sm:leading-[1.7]">
            <p>
              On a vu des profs donner leurs heures au répétitif, pendant que
              la pédagogie — ce pour quoi ils sont là — passe en deuxième.
            </p>

            <p>
              On s&apos;est dit que ça ne devait pas marcher comme ça. Que la
              digitalisation et l&apos;IA, si elles servent à quelque chose,
              c&apos;est à{" "}
              <em className="not-italic font-semibold text-amber-950">
                vous rendre du temps
              </em>
              . Pas à vous remplacer.
            </p>

            <p>
              Alors on a construit Jisr. Vos cours, vos quiz, vos sessions,
              vos élèves — dans un seul outil. Avec une IA qui prend ce qui
              se répète&nbsp;: la correction, la prépa, le suivi.
            </p>

            <p>
              Même avec l&apos;IA,{" "}
              <em className="not-italic font-semibold text-amber-950">
                c&apos;est vous qui enseignez
              </em>
              . Nous, on est le pont.
            </p>

            <div className="flex items-center gap-3 pt-3">
              <span aria-hidden className="h-px w-12 bg-amber-950/25" />
              <p className="font-serif text-sm italic text-amber-950/65">
                Engagement de l&apos;équipe Jisr
              </p>
            </div>

            {/* Morocco credit — folded in as a quiet provenance line */}
            <div className="border-t border-amber-950/10 pt-6">
              <p className="text-sm leading-relaxed text-amber-950/65">
                Construit au Maroc, avec une prof qui enseigne en ligne à ses
                élèves — bac, IELTS, TOEFL. Rien ne sort sans avoir été utilisé
                avec ses vrais élèves.
              </p>
            </div>
          </div>
        </div>

        {/* ── ILLUSTRATION COLUMN (right, sticky-centered on lg+) ──── */}
        {/* `lg:self-stretch` lets this column inherit the grid-row height so the
            inner sticky figure has room to slide. `top: 50vh` + a negative
            translate vertically centers the figure in the viewport while pinned. */}
        <div className="order-1 lg:order-2 lg:self-stretch">
          <figure className="relative lg:sticky lg:top-[50vh] lg:-translate-y-1/2">
            {/* Soft anchor shadow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-6 bottom-1 h-10 rounded-[100%] bg-amber-950/10 blur-2xl"
            />

            <div className="relative overflow-hidden rounded-sm">
              <Image
                src="/conviction-bridge.png"
                alt="Un prof debout face à un pont qui s'étire vers une lumière chaude — une main ouverte l'attend à l'autre extrémité, au milieu d'une constellation d'outils."
                width={1370}
                height={768}
                priority={false}
                className="h-auto w-full select-none"
                sizes="(min-width: 1024px) 36rem, (min-width: 640px) 90vw, 100vw"
              />
            </div>

            {/* Corner ticks — printed-plate framing */}
            <CornerTick className="absolute -left-1 -top-1 hidden h-4 w-4 text-amber-950/40 sm:block" />
            <CornerTick className="absolute -right-1 -top-1 hidden h-4 w-4 rotate-90 text-amber-950/40 sm:block" />
            <CornerTick className="absolute -bottom-1 -left-1 hidden h-4 w-4 -rotate-90 text-amber-950/40 sm:block" />
            <CornerTick className="absolute -bottom-1 -right-1 hidden h-4 w-4 rotate-180 text-amber-950/40 sm:block" />
          </figure>
        </div>
      </div>
    </section>
  );
}

function CornerTick({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      className={className}
    >
      <path d="M 2 6 L 2 2 L 6 2" strokeLinecap="round" />
    </svg>
  );
}
