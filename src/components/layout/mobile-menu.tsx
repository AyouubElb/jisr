"use client";

import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  labels: {
    menu: string;
    navHowItWorks: string;
    navTools: string;
    navFaq: string;
    login: string;
    joinWaitlist: string;
    language: string;
  };
}

export function MobileMenu({ labels }: MobileMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const close = (): void => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={labels.menu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[84vw] max-w-sm flex-col gap-0 p-0"
      >
        <SheetTitle className="border-b border-border/60 px-6 py-4 text-base text-amber-950">
          <span className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold tracking-tight">Jisr</span>
            <span
              aria-hidden
              className="text-sm font-semibold text-primary"
              style={{ lineHeight: 1 }}
            >
              ج
            </span>
          </span>
        </SheetTitle>

        <nav className="flex flex-col gap-1 px-3 py-4">
          <SmoothScrollLink
            href="#comment-ca-marche"
            onClick={close}
            className="rounded-md px-3 py-2.5 text-base font-medium text-amber-950 transition-colors hover:bg-muted"
          >
            {labels.navHowItWorks}
          </SmoothScrollLink>
          <SmoothScrollLink
            href="#fonctionnalites"
            onClick={close}
            className="rounded-md px-3 py-2.5 text-base font-medium text-amber-950 transition-colors hover:bg-muted"
          >
            {labels.navTools}
          </SmoothScrollLink>
          <SmoothScrollLink
            href="#faq"
            onClick={close}
            className="rounded-md px-3 py-2.5 text-base font-medium text-amber-950 transition-colors hover:bg-muted"
          >
            {labels.navFaq}
          </SmoothScrollLink>
        </nav>

        <div className="mt-auto border-t border-border/60 px-6 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {labels.language}
          </p>
          <LocaleToggle variant="row" />
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 px-6 py-4">
          <Link
            href="/login"
            onClick={close}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
          >
            {labels.login}
          </Link>
          <SmoothScrollLink
            href="#waitlist"
            onClick={close}
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            {labels.joinWaitlist}
            <ArrowRight className="h-4 w-4" />
          </SmoothScrollLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}
