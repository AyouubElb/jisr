import { Check } from "lucide-react";

const points = [
  "Aucune commission sur vos élèves existants — ce que vous gagnez, vous le gardez",
  "Niveaux CEFR natifs (A1 à C2) — adaptés aux examens IELTS, TOEFL et bac",
  "Interface 100 % en français — intuitive pour vous et vos élèves",
  "Tarifs en dirhams, paiement par virement — pas de carte étrangère obligatoire",
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
              Les grandes plateformes prennent une commission sur chaque
              élève. Jisr ne prend rien sur les élèves que vous amenez. Construit
              au Maroc, avec les vrais besoins des instructeurs ici.
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
