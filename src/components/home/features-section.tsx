import { BookOpen, Calendar, LineChart, FileText } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Cours et leçons structurés",
    description:
      "Organisez vos leçons par niveau CEFR (A1 à C2). Grammaire, vocabulaire, ressources — tout au même endroit.",
  },
  {
    icon: FileText,
    title: "Quiz et évaluations",
    description:
      "Créez des quiz à choix multiples, à trous, ou à réponse libre. Les résultats sont suivis automatiquement.",
  },
  {
    icon: Calendar,
    title: "Sessions en direct",
    description:
      "Planifiez vos cours avec un lien Meet ou Zoom. Vos élèves reçoivent les détails et rejoignent en un clic.",
  },
  {
    icon: LineChart,
    title: "Suivi d'engagement",
    description:
      "Voyez qui progresse, qui décroche, et qui a besoin d'un coup de pouce — avant qu'il ne soit trop tard.",
  },
];

export function FeaturesSection(): React.JSX.Element {
  return (
    <section
      id="fonctionnalites"
      className="border-b border-border/60"
    >
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            Tout ce dont vous avez besoin pour enseigner
          </h2>
          <p className="mt-4 text-muted-foreground">
            Une boîte à outils complète — sans l&apos;usine à gaz d&apos;un LMS
            scolaire.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-amber-950">
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
