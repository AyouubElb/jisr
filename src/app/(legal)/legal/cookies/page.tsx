import type { Metadata } from "next";
import {
  LegalHero,
  LegalLayoutGrid,
  LegalSection,
  LegalList,
} from "@/components/legal/legal-content";
import { CONTACT_EMAIL } from "@/lib/constants/contact";

export const metadata: Metadata = {
  title: "Cookies — Jisr",
  description:
    "Les cookies utilisés par Jisr : uniquement des cookies essentiels au fonctionnement du service.",
};

const TOC = [
  { id: "utilisation", label: "Ce que nous utilisons" },
  { id: "essentiels", label: "Cookies essentiels" },
  { id: "gerer", label: "Gérer les cookies" },
  { id: "evolution", label: "Évolution" },
];

export default function CookiesPage(): React.JSX.Element {
  return (
    <>
      <LegalHero eyebrow="Cookies" title="Politique relative aux cookies" />
      <LegalLayoutGrid toc={TOC} updated="5 juin 2026">
        <LegalSection id="utilisation" heading="Ce que nous utilisons">
          <p>
            Jisr n&apos;utilise que des cookies strictement nécessaires au
            fonctionnement du service. Nous n&apos;utilisons aucun cookie
            publicitaire, ni aucun outil de pistage ou d&apos;analyse
            comportementale.
          </p>
        </LegalSection>

        <LegalSection id="essentiels" heading="Cookies essentiels">
          <LegalList
            items={[
              "Cookie de session (authentification) : vous maintient connecté·e en toute sécurité. Géré par notre fournisseur d'authentification (Supabase).",
              "Préférence d'interface : mémorise l'état d'affichage du menu latéral pour votre confort.",
            ]}
          />
          <p>
            Ces cookies étant indispensables au fonctionnement de la plateforme,
            ils ne nécessitent pas de consentement préalable. Sans eux, vous ne
            pourriez pas vous connecter ni utiliser le service.
          </p>
        </LegalSection>

        <LegalSection id="gerer" heading="Gérer les cookies">
          <p>
            Vous pouvez configurer votre navigateur pour bloquer ou supprimer les
            cookies. Notez toutefois que le blocage des cookies essentiels
            empêchera la connexion à votre compte.
          </p>
        </LegalSection>

        <LegalSection id="evolution" heading="Évolution">
          <p>
            Si nous introduisons un jour des cookies non essentiels (par exemple
            de mesure d&apos;audience), nous mettrons à jour cette page et
            recueillerons votre consentement au préalable. Pour toute question :{" "}
            {CONTACT_EMAIL}.
          </p>
        </LegalSection>
      </LegalLayoutGrid>
    </>
  );
}
