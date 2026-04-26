import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

export default function RegisterPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Mail className="h-7 w-7" />
      </div>

      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          Acces sur invitation
        </h1>
        <p className="text-muted-foreground">
          La creation de compte se fait uniquement sur invitation.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5 text-sm">
        <div>
          <p className="font-semibold text-amber-950">Etudiants</p>
          <p className="text-muted-foreground">
            Votre instructeur vous enverra un lien d&apos;invitation par e-mail
            pour rejoindre ses cours.
          </p>
        </div>
        <div>
          <p className="font-semibold text-amber-950">Instructeurs</p>
          <p className="text-muted-foreground">
            Contactez-nous pour obtenir un acces a la plateforme.
          </p>
        </div>
      </div>

      <Link href="/login" className="block">
        <Button variant="outline" size="lg" className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour a la connexion
        </Button>
      </Link>
    </div>
  );
}
