import type { Metadata } from "next";
import {
  LegalHero,
  LegalLayoutGrid,
  LegalSection,
  LegalList,
} from "@/components/legal/legal-content";
import { CONTACT_EMAIL } from "@/lib/constants/contact";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Jisr",
  description:
    "Les conditions régissant l'utilisation de la plateforme Jisr par les professeurs et les élèves.",
};

// NOTE (founder): draft to launch the closed cohort. Placeholders [À COMPLÉTER]
// (legal identity, governing-city) must be filled before public launch. Not legal
// advice — have a lawyer review before opening public signups or taking payments.
const TOC = [
  { id: "objet", label: "Objet" },
  { id: "editeur", label: "Éditeur" },
  { id: "comptes", label: "Comptes et rôles" },
  { id: "usage", label: "Utilisation acceptable" },
  { id: "contenu", label: "Contenu et propriété" },
  { id: "ia", label: "Fonctionnalités d'IA" },
  { id: "paiement", label: "Formules et paiement" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "resiliation", label: "Résiliation" },
  { id: "droit", label: "Droit applicable" },
];

export default function TermsPage(): React.JSX.Element {
  return (
    <>
      <LegalHero eyebrow="Légal" title="Conditions d'utilisation" />
      <LegalLayoutGrid toc={TOC} updated="5 juin 2026">
        <LegalSection id="objet" heading="Objet">
          <p>
            Les présentes conditions régissent l&apos;accès et
            l&apos;utilisation de Jisr, plateforme d&apos;assistance pédagogique
            destinée aux professeurs d&apos;anglais et à leurs élèves. En créant
            un compte ou en utilisant le service, vous acceptez ces conditions.
          </p>
        </LegalSection>

        <LegalSection id="editeur" heading="Éditeur du service">
          <p>
            Jisr est édité par Ayoub [Nom complet — À COMPLÉTER], opérant en tant
            que personne physique au Maroc. Contact : {CONTACT_EMAIL}.
          </p>
        </LegalSection>

        <LegalSection id="comptes" heading="Comptes et rôles">
          <LegalList
            items={[
              "Professeurs : créent des cours, des leçons, des quiz, et gèrent leurs élèves.",
              "Élèves : accèdent aux cours auxquels leur professeur les a inscrits ; ils ne s'inscrivent pas eux-mêmes.",
              "Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.",
            ]}
          />
          <p>
            Le professeur qui crée des comptes pour ses élèves s&apos;engage à
            disposer des autorisations nécessaires, notamment le consentement
            parental pour les mineurs.
          </p>
        </LegalSection>

        <LegalSection id="usage" heading="Utilisation acceptable">
          <p>Vous vous engagez à ne pas :</p>
          <LegalList
            items={[
              "Utiliser le service à des fins illégales ou nuisibles.",
              "Tenter d'accéder aux données d'autres utilisateurs sans autorisation.",
              "Perturber le fonctionnement de la plateforme (surcharge, contournement des limites, rétro-ingénierie).",
              "Téléverser du contenu illicite, diffamatoire ou portant atteinte aux droits de tiers.",
            ]}
          />
        </LegalSection>

        <LegalSection id="contenu" heading="Contenu et propriété">
          <p>
            Vous conservez la propriété du contenu que vous créez ou téléversez
            (cours, leçons, documents). Vous nous accordez une licence limitée
            permettant de stocker et d&apos;afficher ce contenu dans le seul but
            de fournir le service. Le code, le design et la marque Jisr restent
            notre propriété.
          </p>
        </LegalSection>

        <LegalSection id="ia" heading="Fonctionnalités d'IA">
          <p>
            Jisr propose des outils de génération et de correction assistés par
            intelligence artificielle. Ces résultats sont des aides et peuvent
            contenir des erreurs ; le professeur reste responsable de la
            vérification du contenu avant utilisation avec ses élèves.
            L&apos;usage de l&apos;IA peut être soumis à des limites selon votre
            formule.
          </p>
        </LegalSection>

        <LegalSection id="paiement" heading="Formules et paiement">
          <p>
            Le service propose une formule gratuite et des formules payantes. Les
            conditions tarifaires en vigueur sont communiquées au moment de la
            souscription. Pendant la phase de lancement, l&apos;accès peut être
            fourni gratuitement ou à un tarif préférentiel aux utilisateurs
            fondateurs.
          </p>
        </LegalSection>

        <LegalSection id="responsabilite" heading="Disponibilité et responsabilité">
          <p>
            Nous nous efforçons d&apos;assurer un service fiable, mais celui-ci
            est fourni « en l&apos;état », sans garantie de disponibilité
            ininterrompue. Dans les limites permises par la loi, notre
            responsabilité ne saurait être engagée pour les dommages indirects ou
            la perte de données résultant d&apos;un usage non conforme.
          </p>
        </LegalSection>

        <LegalSection id="resiliation" heading="Résiliation">
          <p>
            Vous pouvez cesser d&apos;utiliser le service à tout moment. Nous
            pouvons suspendre ou résilier un compte en cas de manquement aux
            présentes conditions, après notification lorsque cela est possible.
          </p>
        </LegalSection>

        <LegalSection id="droit" heading="Droit applicable">
          <p>
            Les présentes conditions sont régies par le droit marocain. Tout
            litige relève des tribunaux compétents de Rabat, Maroc.
          </p>
        </LegalSection>
      </LegalLayoutGrid>
    </>
  );
}
