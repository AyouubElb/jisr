import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CONTACT_WHATSAPP_URL } from "@/lib/constants/contact";

export function FinalCta(): React.JSX.Element {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-primary p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            On en discute 15 minutes ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-800/80">
            15 minutes sur WhatsApp ou par téléphone pour comprendre votre
            besoin et vous montrer Jisr. Si ça vous plaît, on vous envoie une
            invitation.
          </p>
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-8 border-stone-900/20 bg-card`}
          >
            Réserver un créneau
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
