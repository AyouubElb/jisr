import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  CONTACT_WHATSAPP_URL,
} from "@/lib/constants/contact";

export async function SiteFooter(): Promise<React.JSX.Element> {
  const t = await getTranslations("home.footer");

  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
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
            <p className="mt-3 text-xs text-muted-foreground">
              {t("tagline")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-950">
              {t("sectionProduct")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <SmoothScrollLink
                  href="#fonctionnalites"
                  className="hover:text-amber-950"
                >
                  {t("linkTools")}
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#faq" className="hover:text-amber-950">
                  {t("linkFaq")}
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink
                  href="#waitlist"
                  className="hover:text-amber-950"
                >
                  {t("linkJoinWaitlist")}
                </SmoothScrollLink>
              </li>
              <li>
                <a
                  href={CONTACT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-950"
                >
                  {t("linkContact")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-950">
              {t("sectionLegal")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/legal/conditions" className="hover:text-amber-950">
                  {t("linkTerms")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/confidentialite"
                  className="hover:text-amber-950"
                >
                  {t("linkPrivacy")}
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-amber-950">
                  {t("linkCookies")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-950">
              {t("sectionContact")}
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="hover:text-amber-950"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  className="hover:text-amber-950"
                >
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{t("city")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
        </div>
      </div>
    </footer>
  );
}
