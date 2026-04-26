import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function FinalCta(): React.JSX.Element {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-primary p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Prêt·e à simplifier votre enseignement ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-800/80">
            Créez votre premier cours en 2 minutes. Aucune carte bancaire,
            aucun engagement.
          </p>
          <Link
            href="/register"
            className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-8 border-stone-900/20 bg-card`}
          >
            Commencer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
