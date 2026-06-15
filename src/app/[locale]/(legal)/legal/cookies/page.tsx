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
  const t = await getTranslations("legal.cookies");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CookiesPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("legal.cookies");
  const tc = await getTranslations("legal.common");

  const TOC = [
    { id: "utilisation", label: t("tocUtilisation") },
    { id: "essentiels", label: t("tocEssentiels") },
    { id: "gerer", label: t("tocGerer") },
    { id: "evolution", label: t("tocEvolution") },
  ];

  return (
    <>
      <TranslationDisclaimer />
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} />
      <LegalLayoutGrid toc={TOC} updated={tc("updated")}>
        <LegalSection id="utilisation" heading={t("utilisationHeading")}>
          <p>{t("utilisationBody")}</p>
        </LegalSection>

        <LegalSection id="essentiels" heading={t("essentielsHeading")}>
          <LegalList
            items={[t("essentielsItem1"), t("essentielsItem2")]}
          />
          <p>{t("essentielsBody2")}</p>
        </LegalSection>

        <LegalSection id="gerer" heading={t("gererHeading")}>
          <p>{t("gererBody")}</p>
        </LegalSection>

        <LegalSection id="evolution" heading={t("evolutionHeading")}>
          <p>{t("evolutionBody", { email: CONTACT_EMAIL })}</p>
        </LegalSection>
      </LegalLayoutGrid>
    </>
  );
}
