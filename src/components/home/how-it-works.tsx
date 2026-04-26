const steps = [
  {
    number: "01",
    title: "Créez votre cours",
    description:
      "Définissez le niveau, le titre, la description. En moins de 2 minutes.",
  },
  {
    number: "02",
    title: "Ajoutez vos élèves",
    description:
      "Vous gardez le contrôle : ajoutez manuellement vos élèves existants, pas d'inscriptions parasites.",
  },
  {
    number: "03",
    title: "Enseignez et suivez",
    description:
      "Planifiez des sessions, partagez des leçons, et mesurez la progression de chacun.",
  },
];

export function HowItWorks(): React.JSX.Element {
  return (
    <section className="border-b border-border/60 bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            Comment ça marche
          </h2>
          <p className="mt-4 text-muted-foreground">
            Trois étapes pour passer de WhatsApp à une classe organisée.
          </p>
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
