import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  CONTACT_WHATSAPP_URL,
} from "@/lib/constants/contact";

export function SiteFooter(): React.JSX.Element {
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
              Le pont entre vous et vos élèves. Sans intermédiaire.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-950">Produit</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <SmoothScrollLink
                  href="#fonctionnalites"
                  className="hover:text-amber-950"
                >
                  Fonctionnalités
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink
                  href="#tarifs"
                  className="hover:text-amber-950"
                >
                  Tarifs
                </SmoothScrollLink>
              </li>
              <li>
                <SmoothScrollLink href="#faq" className="hover:text-amber-950">
                  FAQ
                </SmoothScrollLink>
              </li>
              <li>
                <a
                  href={CONTACT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-950"
                >
                  Demander un accès
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-950">Légal</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/legal/conditions" className="hover:text-amber-950">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/confidentialite"
                  className="hover:text-amber-950"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-amber-950">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-950">Contact</h3>
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
                <span>Casablanca, Maroc</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Jisr. Tous droits réservés.</span>
          <span>Fait avec soin à Casablanca</span>
        </div>
      </div>
    </footer>
  );
}
