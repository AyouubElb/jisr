import { buttonVariants } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-2xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-9 w-9 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">English Learn</h1>
        <p className="text-lg text-muted-foreground">
          Apprenez l&apos;anglais avec des cours structures, des sessions en direct et des ressources
          pedagogiques de qualite.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Se connecter
          </Link>
          <Link href="/register" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Creer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
