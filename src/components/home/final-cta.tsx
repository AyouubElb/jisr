"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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

const SITUATION_OPTIONS = [
  { value: "indep_online", label: "Prof indépendant·e (cours en ligne)" },
  {
    value: "indep_inperson",
    label: "Prof indépendant·e (cours en présentiel)",
  },
  { value: "school", label: "Prof dans une école ou centre de langues" },
  { value: "student_teacher", label: "Étudiant·e qui enseigne en parallèle" },
  { value: "other", label: "Autre profil" },
] as const;

const TIME_SINK_OPTIONS = [
  { value: "correction", label: "Correction des copies et quiz" },
  { value: "prep", label: "Préparation des cours et supports" },
  {
    value: "whatsapp",
    label: "Communication WhatsApp avec élèves et parents",
  },
  { value: "admin", label: "Suivi des paiements et de l'administration" },
  { value: "acquisition", label: "Trouver de nouveaux élèves" },
] as const;

export function FinalCta(): React.JSX.Element {
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
      toast.error("Veuillez entrer votre nom complet");
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      toast.error("Adresse e-mail invalide");
      return;
    }
    if (cleanPhone.length < 6) {
      toast.error("Veuillez entrer votre numéro WhatsApp");
      return;
    }
    if (!situation) {
      toast.error("Sélectionnez votre situation actuelle");
      return;
    }
    if (!timeSink) {
      toast.error("Sélectionnez ce qui vous prend le plus de temps");
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    // `waitlist` table not yet in generated Database types — cast through unknown.
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
        toast.success(
          "Vous êtes déjà sur la liste — on vous tient au courant.",
        );
        setSubmitted(true);
      } else {
        toast.error("Une erreur est survenue. Réessayez dans un instant.");
      }
      setIsPending(false);
      return;
    }

    toast.success("C'est noté — on vous écrit dès l'ouverture des places.");
    setSubmitted(true);
    setIsPending(false);
  };

  return (
    <section id="waitlist" className="border-b border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-primary">
          <div className="grid gap-0 lg:grid-cols-2">
            {/* Left — copy */}
            <div className="p-10 sm:p-12 lg:p-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-900/70">
                Programme fondateur · 10 places
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                Soyez parmi les 10 premiers profs.
              </h2>
              <p className="mt-4 text-stone-800/80">
                1 mois offert, puis{" "}
                <strong className="text-stone-900">
                  99&nbsp;DH/mois à vie
                </strong>{" "}
                (au lieu de 199 DH). Laissez vos coordonnées — on vous écrit dès
                l&apos;ouverture des places.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-stone-900/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                  Tarif bloqué à vie — aucune augmentation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                  Onboarding personnalisé avec le fondateur
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                  Influence directe sur la roadmap
                </li>
              </ul>
            </div>

            {/* Right — form card */}
            <div className="border-t border-stone-900/10 bg-card p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              {submitted ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  <p className="text-lg font-semibold text-amber-950">
                    Vous êtes sur la liste.
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    On vous écrit dès l&apos;ouverture des 10 places fondateur.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-name">Nom complet</Label>
                    <Input
                      id="waitlist-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Fatima Benali"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isPending}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-email">Adresse e-mail</Label>
                    <Input
                      id="waitlist-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-phone">WhatsApp / Téléphone</Label>
                    <Input
                      id="waitlist-phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="+212 6XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isPending}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-situation">
                      Votre situation actuelle
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
                        <SelectValue placeholder="Choisissez une option…" />
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
                      Ce qui vous prend le plus de temps en dehors du cours
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
                        <SelectValue placeholder="Choisissez une option…" />
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
                      "Envoi..."
                    ) : (
                      <>
                        Rejoindre la liste
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="space-y-1.5">
                    <p className="text-center text-xs text-muted-foreground">
                      Une particularité à mentionner&nbsp;? Vous nous le direz
                      pendant l&apos;appel.
                    </p>
                    <p className="text-center text-xs text-muted-foreground">
                      Pas de spam. Un seul message à l&apos;ouverture des
                      places.
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
