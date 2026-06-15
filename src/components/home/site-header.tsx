import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";

export async function SiteHeader(): Promise<React.JSX.Element> {
  const t = await getTranslations("home.header");

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
            {t("navHowItWorks")}
          </SmoothScrollLink>
          <SmoothScrollLink
            href="#fonctionnalites"
            className="hover:text-amber-950"
          >
            {t("navTools")}
          </SmoothScrollLink>
          <SmoothScrollLink href="#faq" className="hover:text-amber-950">
            {t("navFaq")}
          </SmoothScrollLink>
        </nav>

        {/* Desktop actions: locale + login + CTA */}
        <div className="hidden items-center gap-1 md:flex">
          <LocaleToggle />
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t("login")}
          </Link>
          <SmoothScrollLink
            href="#waitlist"
            className={buttonVariants({ size: "sm" })}
          >
            {t("joinWaitlist")}
            <ArrowRight className="h-4 w-4" />
          </SmoothScrollLink>
        </div>

        {/* Mobile: single hamburger that opens a sheet with nav + locale + auth */}
        <div className="flex items-center md:hidden">
          <MobileMenu
            labels={{
              menu: t("menu"),
              navHowItWorks: t("navHowItWorks"),
              navTools: t("navTools"),
              navFaq: t("navFaq"),
              login: t("login"),
              joinWaitlist: t("joinWaitlist"),
              language: t("language"),
            }}
          />
        </div>
      </div>
    </header>
  );
}
