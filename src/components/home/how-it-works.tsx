import { getTranslations } from "next-intl/server";

export async function HowItWorks(): Promise<React.JSX.Element> {
  const t = await getTranslations("home.howItWorks");

  const steps = [
    {
      number: "01",
      title: t("step1Title"),
      description: t("step1Description"),
    },
    {
      number: "02",
      title: t("step2Title"),
      description: t("step2Description"),
    },
    {
      number: "03",
      title: t("step3Title"),
      description: t("step3Description"),
    },
  ];

  return (
    <section id="comment-ca-marche" className="border-b border-border/60 bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ number, title, description }) => (
            <div key={number} className="relative">
              <div className="text-5xl font-bold text-primary/30">{number}</div>
              <h3 className="mt-2 text-lg font-semibold text-amber-950">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
