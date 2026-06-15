import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalHero,
  LegalLayoutGrid,
  LegalSection,
  LegalList,
} from "@/components/legal/legal-content";
import { TranslationDisclaimer } from "@/components/legal/translation-disclaimer";
import { CONTACT_EMAIL } from "@/lib/constants/contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// NOTE (founder): draft to launch the closed cohort. Placeholders [À COMPLÉTER]
// (legal identity, governing-city) must be filled before public launch. Not legal
// advice — have a lawyer review before opening public signups or taking payments.

export default async function TermsPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("legal.terms");
  const tc = await getTranslations("legal.common");

  const TOC = [
    { id: "objet", label: t("tocObjet") },
    { id: "editeur", label: t("tocEditeur") },
    { id: "comptes", label: t("tocComptes") },
    { id: "usage", label: t("tocUsage") },
    { id: "contenu", label: t("tocContenu") },
    { id: "ia", label: t("tocIa") },
    { id: "paiement", label: t("tocPaiement") },
    { id: "responsabilite", label: t("tocResponsabilite") },
    { id: "resiliation", label: t("tocResiliation") },
    { id: "droit", label: t("tocDroit") },
  ];

  return (
    <>
      <TranslationDisclaimer />
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} />
      <LegalLayoutGrid toc={TOC} updated={tc("updated")}>
        <LegalSection id="objet" heading={t("objetHeading")}>
          <p>{t("objetBody")}</p>
        </LegalSection>

        <LegalSection id="editeur" heading={t("editeurHeading")}>
          <p>{t("editeurBody", { email: CONTACT_EMAIL })}</p>
        </LegalSection>

        <LegalSection id="comptes" heading={t("comptesHeading")}>
          <LegalList
            items={[
              t("comptesItem1"),
              t("comptesItem2"),
              t("comptesItem3"),
            ]}
          />
          <p>{t("comptesBody2")}</p>
        </LegalSection>

        <LegalSection id="usage" heading={t("usageHeading")}>
          <p>{t("usageIntro")}</p>
          <LegalList
            items={[
              t("usageItem1"),
              t("usageItem2"),
              t("usageItem3"),
              t("usageItem4"),
            ]}
          />
        </LegalSection>

        <LegalSection id="contenu" heading={t("contenuHeading")}>
          <p>{t("contenuBody")}</p>
        </LegalSection>

        <LegalSection id="ia" heading={t("iaHeading")}>
          <p>{t("iaBody")}</p>
        </LegalSection>

        <LegalSection id="paiement" heading={t("paiementHeading")}>
          <p>{t("paiementBody")}</p>
        </LegalSection>

        <LegalSection id="responsabilite" heading={t("responsabiliteHeading")}>
          <p>{t("responsabiliteBody")}</p>
        </LegalSection>

        <LegalSection id="resiliation" heading={t("resiliationHeading")}>
          <p>{t("resiliationBody")}</p>
        </LegalSection>

        <LegalSection id="droit" heading={t("droitHeading")}>
          <p>{t("droitBody")}</p>
        </LegalSection>
      </LegalLayoutGrid>
    </>
  );
}
