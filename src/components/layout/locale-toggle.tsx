"use client";

import { Check, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
};

interface LocaleToggleProps {
  className?: string;
  /**
   * "icon" (default): compact icon-only trigger for headers.
   * "row": full-width row of buttons for in-sheet usage on mobile.
   */
  variant?: "icon" | "row";
}

export function LocaleToggle({
  className,
  variant = "icon",
}: LocaleToggleProps): React.JSX.Element {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: string): void => {
    if (next === currentLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  if (variant === "row") {
    return (
      <div
        className={cn("flex items-center gap-2", className)}
        role="group"
        aria-label="Language"
      >
        {routing.locales.map((locale) => {
          const isActive = locale === currentLocale;
          return (
            <button
              key={locale}
              type="button"
              onClick={() => switchTo(locale)}
              disabled={isPending || isActive}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-amber-950"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-amber-950",
                isPending && !isActive && "opacity-60",
              )}
            >
              {isActive && <Check className="h-4 w-4 text-primary" />}
              {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change language"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          isPending && "opacity-60",
          className,
        )}
      >
        <Globe className="h-4.5 w-4.5" />
        <span className="uppercase tracking-wider">{currentLocale}</span>
        <span className="sr-only">
          (current language: {LOCALE_LABELS[currentLocale] ?? currentLocale})
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-40">
        {routing.locales.map((locale) => {
          const isActive = locale === currentLocale;
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => switchTo(locale)}
              disabled={isPending || isActive}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex cursor-pointer items-center justify-between",
                isActive && "font-semibold text-amber-950",
              )}
            >
              <span>{LOCALE_LABELS[locale] ?? locale.toUpperCase()}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
