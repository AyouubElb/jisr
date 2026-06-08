import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold tracking-tight text-amber-950">
            Jisr
          </span>
          <span
            aria-hidden
            className="text-base font-semibold text-primary"
            style={{ lineHeight: 1 }}
          >
            ج
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <SmoothScrollLink
            href="#comment-ca-marche"
            className="hover:text-amber-950"
          >
            Comment ça marche
          </SmoothScrollLink>
          <SmoothScrollLink
            href="#fonctionnalites"
            className="hover:text-amber-950"
          >
            Les outils
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
          <SmoothScrollLink
            href="#waitlist"
            className={buttonVariants({ size: "sm" })}
          >
            Rejoindre la liste
            <ArrowRight className="h-4 w-4" />
          </SmoothScrollLink>
        </div>
      </div>
    </header>
  );
}
