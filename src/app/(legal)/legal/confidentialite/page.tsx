import type { Metadata } from "next";
import {
  LegalHero,
  LegalLayoutGrid,
  LegalSection,
  LegalList,
} from "@/components/legal/legal-content";
import { CONTACT_EMAIL } from "@/lib/constants/contact";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Jisr",
  description:
    "Comment Jisr collecte, utilise et protège les données personnelles, conformément à la loi marocaine 09-08.",
};

// NOTE (founder): placeholders marked [À COMPLÉTER] must be filled before public
// launch — especially the CNDP declaration number, which the law requires to be
// displayed once obtained. This draft is Law 09-08-aware but is not legal advice;
// have a Moroccan data-protection lawyer review before opening public signups.
const TOC = [
  { id: "responsable", label: "Responsable" },
  { id: "donnees", label: "Données collectées" },
  { id: "usage", label: "Utilisation" },
  { id: "mineurs", label: "Élèves mineurs" },
  { id: "acces", label: "Accès aux données" },
  { id: "transfert", label: "Hébergement à l'étranger" },
  { id: "conservation", label: "Conservation" },
  { id: "droits", label: "Vos droits" },
  { id: "securite", label: "Sécurité" },
  { id: "modifications", label: "Modifications" },
];

export default function PrivacyPage(): React.JSX.Element {
  return (
    <>
      <LegalHero eyebrow="Confidentialité" title="Politique de confidentialité" />
      <LegalLayoutGrid toc={TOC} updated="5 juin 2026">
        <LegalSection id="responsable" heading="Qui est responsable de vos données">
          <p>
            Jisr est une plateforme d&apos;assistance pédagogique pour les
            professeurs d&apos;anglais au Maroc. Le responsable du traitement des
            données est Ayoub [Nom complet — À COMPLÉTER], fondateur de Jisr,
            joignable à l&apos;adresse {CONTACT_EMAIL}.
          </p>
          <p>
            Le présent traitement est régi par la loi marocaine n° 09-08 relative
            à la protection des personnes physiques à l&apos;égard du traitement
            des données à caractère personnel, sous le contrôle de la Commission
            Nationale de contrôle de la protection des Données à caractère
            Personnel (CNDP).
          </p>
          <p>Numéro de déclaration CNDP : [À COMPLÉTER après dépôt].</p>
        </LegalSection>

        <LegalSection id="donnees" heading="Quelles données nous collectons">
          <p>Selon que vous êtes professeur ou élève, nous collectons :</p>
          <LegalList
            items={[
              "Données de compte : nom, adresse e-mail, rôle (professeur, élève, administrateur), niveau CEFR pour les élèves.",
              "Contenu pédagogique : cours, leçons, quiz, documents que vous créez ou téléversez.",
              "Données d'activité des élèves : tentatives de quiz, réponses, leçons terminées, présence aux sessions, dates de dernière activité.",
              "Données techniques minimales : journaux d'erreurs (via Sentry) et cookies essentiels de session.",
            ]}
          />
          <p>
            Nous ne collectons aucune donnée sensible au sens de la loi 09-08
            (santé, opinions politiques ou religieuses, etc.).
          </p>
        </LegalSection>

        <LegalSection id="usage" heading="Pourquoi nous les utilisons">
          <LegalList
            items={[
              "Fournir le service : créer des comptes, afficher les cours, permettre la passation de quiz et le suivi des élèves.",
              "Générer du contenu pédagogique assisté par IA (quiz, leçons, corrections) à la demande du professeur.",
              "Permettre au professeur de suivre la progression de ses propres élèves.",
              "Assurer la sécurité, détecter les erreurs et améliorer le produit.",
              "Communiquer avec vous (invitations, e-mails liés au compte).",
            ]}
          />
          <p>
            Les données d&apos;apprentissage agrégées ne sont jamais vendues ni
            exploitées comme source de revenus ; elles servent uniquement, en
            interne, à améliorer le produit.
          </p>
        </LegalSection>

        <LegalSection id="mineurs" heading="Données des élèves mineurs">
          <p>
            Une partie des élèves peut être mineure. Les comptes élèves sont créés
            et gérés par le professeur, qui est responsable d&apos;obtenir le
            consentement parental nécessaire avant d&apos;inscrire un élève
            mineur. Nous limitons la collecte au strict nécessaire pour le suivi
            pédagogique.
          </p>
        </LegalSection>

        <LegalSection id="acces" heading="Qui a accès à vos données">
          <LegalList
            items={[
              "Votre professeur (pour les élèves) : il voit l'activité et les résultats de ses propres élèves uniquement.",
              "Vous-même : vous accédez à vos propres données.",
              "L'équipe Jisr : accès limité pour le support et la maintenance.",
"Nos sous-traitants techniques (voir « Hébergement à l'étranger »).",
            ]}
          />
          <p>
            Les élèves ne voient jamais les données nominatives des autres élèves.
          </p>
        </LegalSection>

        <LegalSection
          id="transfert"
          heading="Sous-traitants et hébergement à l'étranger"
        >
          <p>
            Pour fonctionner, Jisr s&apos;appuie sur des prestataires dont les
            serveurs sont situés hors du Maroc. Cela constitue un transfert
            international de données au sens de la loi 09-08 :
          </p>
          <LegalList
            items={[
              "Supabase — base de données, authentification et stockage de fichiers.",
              "Vercel — hébergement de l'application.",
              "Anthropic et OpenAI — génération et correction de contenu par IA.",
              "Resend — envoi des e-mails transactionnels.",
              "Upstash — limitation de débit (anti-abus).",
              "Sentry — surveillance des erreurs techniques.",
            ]}
          />
          <p>
            Ces transferts font l&apos;objet des formalités requises auprès de la
            CNDP [autorisation de transfert — À COMPLÉTER / en cours]. Nous
            choisissons des prestataires offrant des garanties de sécurité
            reconnues.
          </p>
        </LegalSection>

        <LegalSection id="conservation" heading="Combien de temps nous les conservons">
          <p>
            Nous conservons vos données tant que votre compte est actif. Lorsque
            le professeur retire un élève d&apos;un cours, l&apos;historique est
            conservé par défaut afin de permettre une éventuelle réinscription ;
            une suppression définitive peut être demandée. À la fermeture
            d&apos;un compte, les données sont supprimées ou anonymisées dans un
            délai raisonnable, sauf obligation légale de conservation.
          </p>
        </LegalSection>

        <LegalSection id="droits" heading="Vos droits">
          <p>Conformément à la loi 09-08, vous disposez des droits suivants :</p>
          <LegalList
            items={[
              "Droit d'accès à vos données.",
              "Droit de rectification des données inexactes.",
              "Droit d'opposition pour motif légitime.",
              "Droit de suppression de vos données.",
            ]}
          />
          <p>
            Pour exercer ces droits, écrivez-nous à {CONTACT_EMAIL}. Vous pouvez
            également saisir la CNDP (www.cndp.ma) en cas de litige.
          </p>
        </LegalSection>

        <LegalSection id="securite" heading="Sécurité">
          <p>
            Nous appliquons des mesures techniques et organisationnelles :
            chiffrement des communications (HTTPS), contrôle d&apos;accès au niveau
            de la base de données (Row Level Security), séparation des rôles et
            surveillance des erreurs. Aucun système n&apos;étant infaillible, nous
            nous engageons à vous informer en cas d&apos;incident affectant vos
            données.
          </p>
        </LegalSection>

        <LegalSection id="modifications" heading="Modifications">
          <p>
            Nous pouvons faire évoluer cette politique. La date de dernière mise à
            jour figure dans le sommaire. En cas de changement important, nous
            vous en informerons.
          </p>
        </LegalSection>
      </LegalLayoutGrid>
    </>
  );
}
