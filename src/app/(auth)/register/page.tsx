"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth.schema";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, GraduationCap, Lock, Mail, User, UserCog } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", password: "", role: "student" },
  });

  const selectedRole = form.watch("role");

  const onSubmit = async (data: RegisterInput): Promise<void> => {
    setIsLoading(true);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, role: data.role },
      },
    });

    if (signUpError) {
      const message =
        signUpError.message === "User already registered"
          ? "Un compte avec cet e-mail existe deja"
          : signUpError.message === "Password should be at least 6 characters"
            ? "Le mot de passe doit contenir au moins 6 caracteres"
            : `Erreur lors de la creation du compte : ${signUpError.message}`;
      toast.error(message);
      setIsLoading(false);
      return;
    }

    if (!signUpData.user) {
      toast.error("Erreur inattendue : aucun utilisateur retourne");
      setIsLoading(false);
      return;
    }

    toast.success("Compte cree avec succes");
    router.push(data.role === "instructor" ? "/instructor" : "/student");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">Creer un compte</h1>
        <p className="text-muted-foreground">
          Commencez votre apprentissage de l&apos;anglais aujourd&apos;hui
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nom complet</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="full_name"
              placeholder="Jean Dupont"
              className="pl-10"
              {...form.register("full_name")}
            />
          </div>
          {form.formState.errors.full_name && (
            <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              className="pl-10"
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              type="password"
              placeholder="Au moins 6 caracteres"
              className="pl-10"
              {...form.register("password")}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Je suis</Label>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              icon={<GraduationCap className="h-5 w-5" />}
              title="Etudiant"
              description="J'apprends l'anglais"
              selected={selectedRole === "student"}
              onClick={() => form.setValue("role", "student")}
            />
            <RoleCard
              icon={<UserCog className="h-5 w-5" />}
              title="Instructeur"
              description="J'enseigne l'anglais"
              selected={selectedRole === "instructor"}
              onClick={() => form.setValue("role", "instructor")}
            />
          </div>
          {form.formState.errors.role && (
            <p className="text-xs text-destructive">{form.formState.errors.role.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? "Creation en cours..." : "Creer mon compte"}
          {!isLoading && <ArrowRight className="ml-1 h-4 w-4" />}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Vous avez deja un compte ?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function RoleCard({ icon, title, description, selected, onClick }: RoleCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all outline-none",
        "hover:border-primary/50 hover:bg-muted/50",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
