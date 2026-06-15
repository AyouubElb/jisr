import { getLocale, getTranslations } from "next-intl/server";

export async function TranslationDisclaimer(): Promise<React.JSX.Element | null> {
  const locale = await getLocale();
  if (locale === "fr") return null;

  const t = await getTranslations("legal.common");

  return (
    <div className="border-b border-amber-200/60 bg-amber-50/60">
      <div className="mx-auto max-w-6xl px-4 py-3 text-xs leading-relaxed text-amber-950/80 sm:px-6">
        {t("translationDisclaimer")}
      </div>
    </div>
  );
}
