import { Check } from "lucide-react";

const points = [
  "Niveaux CEFR natifs (A1 à C2) — adaptés aux examens IELTS, TOEFL et bac",
  "Interface 100 % en français — intuitive pour vous et vos élèves",
  "Tarifs en dirhams — sans commission sur vos élèves existants",
  "Conçu pour le contexte marocain — pas une copie d'un outil américain",
];

export function MoroccoSection(): React.JSX.Element {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
              Pensé pour les profs marocains
            </h2>
            <p className="mt-4 text-muted-foreground">
              Les grandes plateformes sont conçues pour des marchés éloignés du
              vôtre. TeachSpace est construit localement, avec les vrais
              besoins des instructeurs au Maroc.
            </p>
          </div>

          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="text-sm text-amber-950">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
