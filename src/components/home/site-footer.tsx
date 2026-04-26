import Link from "next/link";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import { SmoothScrollLink } from "@/components/home/smooth-scroll-link";

export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </span>
              <span className="text-base font-semibold text-amber-950">
                TeachSpace
              </span>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Conçu au Maroc pour les profs d&apos;anglais. Une boîte à outils
              simple, en français.
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
                <Link href="/register" className="hover:text-amber-950">
                  Créer un compte
                </Link>
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
                  href="mailto:contact@teachspace.ma"
                  className="hover:text-amber-950"
                >
                  contact@teachspace.ma
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+212600000000" className="hover:text-amber-950">
                  +212 6 00 00 00 00
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
          <span>© {new Date().getFullYear()} TeachSpace. Tous droits réservés.</span>
          <span>Fait avec soin à Casablanca</span>
        </div>
      </div>
    </footer>
  );
}
