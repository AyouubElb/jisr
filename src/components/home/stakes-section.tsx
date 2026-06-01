const stakes = [
  "47 messages WhatsApp non lus le mardi soir.",
  "23 copies en attente le dimanche matin.",
  "5 h de prépa, chaque semaine. Toujours.",
  "Et toujours pas le temps pour les élèves qui frappent à votre porte.",
] as const;

export function StakesSection(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden bg-stone-100">
      {/* Subtle paper grain — same idiom as ConvictionSection */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 35%, #451a03 1px, transparent 1px), radial-gradient(circle at 75% 65%, #451a03 1px, transparent 1px)",
          backgroundSize: "32px 32px, 48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 py-20 sm:px-8 sm:py-24">
        {/* ── Eyebrow ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-amber-950/30" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-950/60">
            Sans Jisr
          </span>
          <span aria-hidden className="h-px flex-1 bg-amber-950/15" />
        </div>

        {/* ── Headline ────────────────────────────────────────────── */}
        <h2 className="mt-8 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight text-amber-950 sm:text-4xl lg:text-5xl">
          Dans 6 mois,{" "}
          <span className="text-amber-950/70">
            voici ce qui n&apos;aura pas changé.
          </span>
        </h2>

        {/* ── Stake list — hairline rail, same idiom as PainSection ─ */}
        <ul className="mt-12 space-y-5 sm:mt-16 sm:space-y-6">
          {stakes.map((stake) => (
            <li
              key={stake}
              className="relative border-l-2 border-amber-950/15 pl-5 sm:pl-6"
            >
              <span
                aria-hidden
                className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-amber-950/30"
              />
              <p className="text-lg leading-snug text-amber-950 sm:text-xl">
                {stake}
              </p>
            </li>
          ))}
        </ul>

        {/* ── Kicker ──────────────────────────────────────────────── */}
        <div className="mt-14 max-w-2xl pl-5 sm:mt-16 sm:pl-6">
          <p className="font-serif text-xl italic leading-snug text-amber-950/80 sm:text-2xl">
            Le problème ne se règle pas tout seul.{" "}
            <span className="font-semibold not-italic text-amber-950">
              Il s&apos;accumule.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
