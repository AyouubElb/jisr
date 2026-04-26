"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStudentSchema, type CreateStudentInput } from "@/lib/schemas/auth.schema";
import { useCreateStudent } from "@/lib/hooks/useEnrollments";
import { useMyCourses } from "@/lib/hooks/useCourses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { CEFR_LEVELS, LEVEL_LABELS } from "@/lib/constants/levels";

export function CreateStudentDialog(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const { mutate: createStudent, isPending } = useCreateStudent();
  const { data: courses } = useMyCourses();
  const publishedCourses = (courses ?? []).filter((c) => c.is_published);

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: { full_name: "", email: "" },
  });

  const onSubmit = (data: CreateStudentInput): void => {
    // Convert empty strings from selects to undefined.
    const payload: CreateStudentInput = {
      ...data,
      level: data.level || undefined,
      course_id: data.course_id || undefined,
    };
    createStudent(payload, {
      onSuccess: (res) => setGeneratedPassword(res.password),
    });
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next) {
      setGeneratedPassword(null);
      form.reset();
    }
    setOpen(next);
  };

  const copyPassword = async (): Promise<void> => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    toast.success("Mot de passe copie");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Ajouter un etudiant
        </Button>
      } />

      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {generatedPassword ? "Compte cree" : "Ajouter un etudiant"}
          </DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          // ── Success: show generated password once ──────────────
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Compte cree. Partagez ce mot de passe temporaire via WhatsApp — il ne sera plus visible apres fermeture.
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5">
              <code className="flex-1 font-mono text-base font-semibold tracking-widest">
                {generatedPassword}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                <Copy className="h-3.5 w-3.5" />
                Copier
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              L&apos;etudiant peut changer ce mot de passe depuis son profil apres connexion.
            </p>
          </div>
        ) : (
          // ── Form ────────────────────────────────────────────────
          <form id="create-student-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cs-full_name">Nom complet</Label>
              <Input
                id="cs-full_name"
                placeholder="Fatima Benali"
                autoComplete="off"
                {...form.register("full_name")}
              />
              {form.formState.errors.full_name && (
                <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cs-email">Adresse e-mail</Label>
              <Input
                id="cs-email"
                type="email"
                placeholder="fatima@gmail.com"
                autoComplete="off"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cs-level">Niveau</Label>
                <select
                  id="cs-level"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...form.register("level")}
                >
                  <option value="">— Optionnel —</option>
                  {CEFR_LEVELS.map((l) => (
                    <option key={l} value={l}>{l} — {LEVEL_LABELS[l]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cs-course">Inscrire dans</Label>
                <select
                  id="cs-course"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...form.register("course_id")}
                >
                  <option value="">— Optionnel —</option>
                  {publishedCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                {publishedCourses.length === 0 && (
                  <p className="text-xs text-muted-foreground">Publiez un cours d&apos;abord</p>
                )}
              </div>
            </div>
          </form>
        )}

        <DialogFooter>
          {generatedPassword ? (
            <DialogClose render={<Button>Fermer</Button>} />
          ) : (
            <>
              <DialogClose render={<Button variant="outline" disabled={isPending}>Annuler</Button>} />
              <Button type="submit" form="create-student-form" disabled={isPending}>
                {isPending ? "Creation..." : "Creer le compte"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
