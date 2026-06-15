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
  const t = await getTranslations("legal.privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// NOTE (founder): placeholders marked [À COMPLÉTER] must be filled before public
// launch — especially the CNDP declaration number, which the law requires to be
// displayed once obtained. This draft is Law 09-08-aware but is not legal advice;
// have a Moroccan data-protection lawyer review before opening public signups.

export default async function PrivacyPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("legal.privacy");
  const tc = await getTranslations("legal.common");

  const TOC = [
    { id: "responsable", label: t("tocResponsable") },
    { id: "donnees", label: t("tocDonnees") },
    { id: "usage", label: t("tocUsage") },
    { id: "mineurs", label: t("tocMineurs") },
    { id: "acces", label: t("tocAcces") },
    { id: "transfert", label: t("tocTransfert") },
    { id: "conservation", label: t("tocConservation") },
    { id: "droits", label: t("tocDroits") },
    { id: "securite", label: t("tocSecurite") },
    { id: "modifications", label: t("tocModifications") },
  ];

  return (
    <>
      <TranslationDisclaimer />
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} />
      <LegalLayoutGrid toc={TOC} updated={tc("updated")}>
        <LegalSection id="responsable" heading={t("responsableHeading")}>
          <p>{t("responsableP1", { email: CONTACT_EMAIL })}</p>
          <p>{t("responsableP2")}</p>
          <p>{t("responsableP3")}</p>
        </LegalSection>

        <LegalSection id="donnees" heading={t("donneesHeading")}>
          <p>{t("donneesIntro")}</p>
          <LegalList
            items={[
              t("donneesItem1"),
              t("donneesItem2"),
              t("donneesItem3"),
              t("donneesItem4"),
            ]}
          />
          <p>{t("donneesBody2")}</p>
        </LegalSection>

        <LegalSection id="usage" heading={t("usageHeading")}>
          <LegalList
            items={[
              t("usageItem1"),
              t("usageItem2"),
              t("usageItem3"),
              t("usageItem4"),
              t("usageItem5"),
            ]}
          />
          <p>{t("usageBody2")}</p>
        </LegalSection>

        <LegalSection id="mineurs" heading={t("mineursHeading")}>
          <p>{t("mineursBody")}</p>
        </LegalSection>

        <LegalSection id="acces" heading={t("accesHeading")}>
          <LegalList
            items={[
              t("accesItem1"),
              t("accesItem2"),
              t("accesItem3"),
              t("accesItem4"),
            ]}
          />
          <p>{t("accesBody2")}</p>
        </LegalSection>

        <LegalSection id="transfert" heading={t("transfertHeading")}>
          <p>{t("transfertP1")}</p>
          <LegalList
            items={[
              t("transfertItem1"),
              t("transfertItem2"),
              t("transfertItem3"),
              t("transfertItem4"),
              t("transfertItem5"),
              t("transfertItem6"),
            ]}
          />
          <p>{t("transfertP2")}</p>
        </LegalSection>

        <LegalSection id="conservation" heading={t("conservationHeading")}>
          <p>{t("conservationBody")}</p>
        </LegalSection>

        <LegalSection id="droits" heading={t("droitsHeading")}>
          <p>{t("droitsIntro")}</p>
          <LegalList
            items={[
              t("droitsItem1"),
              t("droitsItem2"),
              t("droitsItem3"),
              t("droitsItem4"),
            ]}
          />
          <p>{t("droitsBody2", { email: CONTACT_EMAIL })}</p>
        </LegalSection>

        <LegalSection id="securite" heading={t("securiteHeading")}>
          <p>{t("securiteBody")}</p>
        </LegalSection>

        <LegalSection id="modifications" heading={t("modificationsHeading")}>
          <p>{t("modificationsBody")}</p>
        </LegalSection>
      </LegalLayoutGrid>
    </>
  );
}
