"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FinalCta(): React.JSX.Element {
  const t = useTranslations("home.finalCta");

  const SITUATION_OPTIONS = [
    { value: "indep_online", label: t("situationIndepOnline") },
    { value: "indep_inperson", label: t("situationIndepInperson") },
    { value: "school", label: t("situationSchool") },
    { value: "student_teacher", label: t("situationStudentTeacher") },
    { value: "other", label: t("situationOther") },
  ] as const;

  const TIME_SINK_OPTIONS = [
    { value: "correction", label: t("timeSinkCorrection") },
    { value: "prep", label: t("timeSinkPrep") },
    { value: "whatsapp", label: t("timeSinkWhatsapp") },
    { value: "admin", label: t("timeSinkAdmin") },
    { value: "acquisition", label: t("timeSinkAcquisition") },
  ] as const;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [situation, setSituation] = useState("");
  const [timeSink, setTimeSink] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2) {
      toast.error(t("errorName"));
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      toast.error(t("errorEmail"));
      return;
    }
    if (cleanPhone.length < 6) {
      toast.error(t("errorPhone"));
      return;
    }
    if (!situation) {
      toast.error(t("errorSituation"));
      return;
    }
    if (!timeSink) {
      toast.error(t("errorTimeSink"));
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    const { error } = await (
      supabase.from("waitlist" as never) as unknown as {
        insert: (values: {
          full_name: string;
          email: string;
          phone: string | null;
          current_situation: string;
          time_sink: string;
          source: string;
        }) => Promise<{ error: { code?: string; message: string } | null }>;
      }
    ).insert({
      full_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      current_situation: situation,
      time_sink: timeSink,
      source: "home_final_cta",
    });

    if (error) {
      if (error.code === "23505") {
        toast.success(t("alreadyOnList"));
        setSubmitted(true);
      } else {
        toast.error(t("submitError"));
      }
      setIsPending(false);
      return;
    }

    toast.success(t("success"));
    setSubmitted(true);
    setIsPending(false);
  };

  return (
    <section id="waitlist" className="border-b border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-primary">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="p-10 sm:p-12 lg:p-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-900/70">
                {t("badge")}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                {t("title")}
              </h2>
              <p className="mt-4 text-stone-800/80">{t("subtitle")}</p>
              <ul className="mt-6 space-y-2 text-sm text-stone-900/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                  {t("bullet1")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                  {t("bullet2")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                  {t("bullet3")}
                </li>
              </ul>
            </div>

            <div className="border-t border-stone-900/10 bg-card p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              {submitted ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  <p className="text-lg font-semibold text-amber-950">
                    {t("successTitle")}
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {t("successSubtitle")}
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-name">{t("labelName")}</Label>
                    <Input
                      id="waitlist-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder={t("placeholderName")}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isPending}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-email">{t("labelEmail")}</Label>
                    <Input
                      id="waitlist-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={t("placeholderEmail")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-phone">{t("labelPhone")}</Label>
                    <Input
                      id="waitlist-phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder={t("placeholderPhone")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isPending}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-situation">
                      {t("labelSituation")}
                    </Label>
                    <Select
                      value={situation}
                      onValueChange={(value) => setSituation(value ?? "")}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="waitlist-situation"
                        className="h-11! w-full"
                      >
                        <SelectValue placeholder={t("selectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {SITUATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-timesink">
                      {t("labelTimeSink")}
                    </Label>
                    <Select
                      value={timeSink}
                      onValueChange={(value) => setTimeSink(value ?? "")}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="waitlist-timesink"
                        className="h-11! w-full"
                      >
                        <SelectValue placeholder={t("selectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SINK_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isPending}
                    className="w-full"
                  >
                    {isPending ? (
                      t("submitting")
                    ) : (
                      <>
                        {t("submit")}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="space-y-1.5">
                    <p className="text-center text-xs text-muted-foreground">
                      {t("footnote1")}
                    </p>
                    <p className="text-center text-xs text-muted-foreground">
                      {t("footnote2")}
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
