const steps = [
  {
    number: "01",
    title: "Une discussion (15 min)",
    description:
      "Sur WhatsApp ou par téléphone, on comprend votre contexte : nombre d'élèves, niveaux, ce qui vous prend le plus de temps aujourd'hui.",
  },
  {
    number: "02",
    title: "Votre invitation arrive",
    description:
      "Si Jisr vous correspond, vous recevez votre lien d'accès personnel sous 48h.",
  },
  {
    number: "03",
    title: "Vous prenez la main",
    description:
      "Ajoutez vos élèves, créez votre premier cours, planifiez vos sessions — depuis votre tableau de bord, sans intermédiaire.",
  },
];

export function HowItWorks(): React.JSX.Element {
  return (
    <section id="comment-ca-marche" className="border-b border-border/60 bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            Comment ça marche
          </h2>
          <p className="mt-4 text-muted-foreground">
            Du premier message à votre première classe — trois étapes.
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
