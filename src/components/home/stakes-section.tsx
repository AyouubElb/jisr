import { getTranslations } from "next-intl/server";

export async function StakesSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("home.stakes");

  const stakes = [t("item1"), t("item2"), t("item3"), t("item4")] as const;

  return (
    <section className="relative overflow-hidden bg-stone-100">
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
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-amber-950/30" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-950/60">
            {t("eyebrow")}
          </span>
          <span aria-hidden className="h-px flex-1 bg-amber-950/15" />
        </div>

        <h2 className="mt-8 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight text-amber-950 sm:text-4xl lg:text-5xl">
          {t("titleLead")}{" "}
          <span className="text-amber-950/70">{t("titleTail")}</span>
        </h2>

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

        <div className="mt-14 max-w-2xl pl-5 sm:mt-16 sm:pl-6">
          <p className="font-serif text-xl italic leading-snug text-amber-950/80 sm:text-2xl">
            {t("kickerLead")}{" "}
            <span className="font-semibold not-italic text-amber-950">
              {t("kickerEmphasis")}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
