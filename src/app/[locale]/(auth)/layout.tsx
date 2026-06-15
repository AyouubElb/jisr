import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const t = await getTranslations("auth.layout");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-stone-100 p-12">
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-8 select-none text-[20rem] font-bold leading-none text-amber-950/[0.04]"
          style={{ fontFamily: "serif" }}
        >
          جسر
        </span>

        <Link
          href="/"
          aria-label={t("backToHomeLabel")}
          className="relative z-10 inline-flex w-fit items-baseline gap-0.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span className="text-2xl font-bold tracking-tight text-amber-950">
            Jisr
          </span>
          <span
            aria-hidden
            className="text-lg font-semibold text-primary"
            style={{ lineHeight: 1 }}
          >
            ج
          </span>
        </Link>

        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-amber-950">
              {t("panelHeadingLine1")}
              <br />
              {t("panelHeadingLine2")}
            </h2>
            <p className="max-w-md text-base text-amber-950/70">
              {t("panelSubtitle")}
            </p>
          </div>

          <div className="space-y-5">
            <Bullet>{t("bullet1")}</Bullet>
            <Bullet>{t("bullet2")}</Bullet>
            <Bullet>{t("bullet3")}</Bullet>
          </div>
        </div>

        <div className="relative z-10 text-sm text-amber-950/60">
          {t("studentNote")}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-end px-4 py-3 sm:px-6">
          <LocaleToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-12 sm:pb-16">
          <div className="w-full max-w-md">
          <Link
            href="/"
            aria-label={t("backToHomeLabel")}
            className="mb-8 flex items-baseline justify-center gap-0.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
          >
            <span className="text-2xl font-bold tracking-tight text-amber-950">
              Jisr
            </span>
            <span
              aria-hidden
              className="text-lg font-semibold text-primary"
              style={{ lineHeight: 1 }}
            >
              ج
            </span>
          </Link>
          {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="relative border-l-2 border-amber-950/15 pl-4">
      <span
        aria-hidden
        className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary"
      />
      <p className="text-sm font-medium text-amber-950 sm:text-base">
        {children}
      </p>
    </div>
  );
}
