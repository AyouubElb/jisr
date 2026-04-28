import { MessageCircle, ClipboardCheck, Coins } from "lucide-react";

const pains = [
  {
    icon: MessageCircle,
    label: "WhatsApp débordé",
  },
  {
    icon: ClipboardCheck,
    label: "Corrections interminables",
  },
  {
    icon: Coins,
    label: "30 % qui partent à l'institut",
  },
];

export function PainSection(): React.JSX.Element {
  return (
    <section className="relative -mt-12 sm:-mt-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative z-10 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="grid items-stretch gap-0 md:grid-cols-[1.2fr_1.8fr]">
            <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 md:border-r md:border-b-0">
              <div className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-destructive uppercase">
                Le quotidien
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl">
                Enseigner, c&apos;est votre métier. Tout le reste vole votre
                temps.
              </h2>
            </div>

            <div className="flex flex-col justify-center divide-y divide-border md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
              {pains.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-5 sm:p-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <Icon className="h-5 w-5 text-destructive" />
                  </div>
                  <span className="text-sm font-medium text-amber-950">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
