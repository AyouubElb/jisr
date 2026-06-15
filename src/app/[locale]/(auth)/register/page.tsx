import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function RegisterPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("auth.register");

  return (
    <div className="space-y-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Mail className="h-7 w-7" />
      </div>

      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5 text-sm">
        <div>
          <p className="font-semibold text-amber-950">{t("studentsTitle")}</p>
          <p className="text-muted-foreground">{t("studentsBody")}</p>
        </div>
        <div>
          <p className="font-semibold text-amber-950">
            {t("instructorsTitle")}
          </p>
          <p className="text-muted-foreground">{t("instructorsBody")}</p>
        </div>
      </div>

      <Link href="/login" className="block">
        <Button variant="outline" size="lg" className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToLogin")}
        </Button>
      </Link>
    </div>
  );
}
