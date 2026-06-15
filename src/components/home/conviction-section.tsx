import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function ConvictionSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("home.conviction");

  return (
    <section className="relative overflow-hidden border-y border-amber-950/10 bg-stone-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #451a03 1px, transparent 1px), radial-gradient(circle at 70% 60%, #451a03 1px, transparent 1px)",
          backgroundSize: "32px 32px, 48px 48px",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] bg-gradient-to-l from-amber-100/40 via-amber-50/15 to-transparent lg:block"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 sm:px-8 sm:pt-20 lg:pt-24">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-amber-950/30" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-950/60">
            {t("eyebrow")}
          </span>
          <span aria-hidden className="h-px flex-1 bg-amber-950/15" />
          <span
            aria-hidden
            className="hidden font-serif text-xs italic text-amber-950/45 md:inline"
          >
            {t("eyebrowAside")}
          </span>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16 lg:pb-28 lg:pt-16">
        <div className="order-2 lg:order-1">
          <div className="max-w-xl space-y-6 text-lg leading-relaxed text-amber-950/85 sm:text-xl sm:leading-[1.7]">
            <p>{t("p1")}</p>

            <p>
              {t("p2Lead")}{" "}
              <em className="not-italic font-semibold text-amber-950">
                {t("p2Emphasis")}
              </em>
              {t("p2Tail")}
            </p>

            <p>{t("p3")}</p>

            <p>
              {t("p4Lead")}{" "}
              <em className="not-italic font-semibold text-amber-950">
                {t("p4Emphasis")}
              </em>
              {t("p4Tail")}
            </p>

            <div className="flex items-center gap-3 pt-3">
              <span aria-hidden className="h-px w-12 bg-amber-950/25" />
              <p className="font-serif text-sm italic text-amber-950/65">
                {t("signature")}
              </p>
            </div>

            <div className="border-t border-amber-950/10 pt-6">
              <p className="text-sm leading-relaxed text-amber-950/65">
                {t("provenance")}
              </p>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:self-stretch">
          <figure className="relative lg:sticky lg:top-[50vh] lg:-translate-y-1/2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-6 bottom-1 h-10 rounded-[100%] bg-amber-950/10 blur-2xl"
            />

            <div className="relative overflow-hidden rounded-sm">
              <Image
                src="/conviction-bridge.png"
                alt={t("imageAlt")}
                width={1370}
                height={768}
                priority={false}
                className="h-auto w-full select-none"
                sizes="(min-width: 1024px) 36rem, (min-width: 640px) 90vw, 100vw"
              />
            </div>

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
