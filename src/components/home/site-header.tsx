import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-amber-950">
            TeachSpace
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <SmoothScrollLink
            href="#fonctionnalites"
            className="hover:text-amber-950"
          >
            Fonctionnalités
          </SmoothScrollLink>
          <SmoothScrollLink href="#tarifs" className="hover:text-amber-950">
            Tarifs
          </SmoothScrollLink>
          <SmoothScrollLink href="#faq" className="hover:text-amber-950">
            FAQ
          </SmoothScrollLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Se connecter
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Commencer
          </Link>
        </div>
      </div>
    </header>
  );
}
