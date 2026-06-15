"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  instructorSignupSchema,
  type InstructorSignupInput,
} from "@/lib/schemas/auth.schema";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface SignupFormProps {
  token: string;
  email: string;
  defaultFullName: string;
  initialError: string | null;
}

export function SignupForm({
  token,
  email,
  defaultFullName,
  initialError,
}: SignupFormProps): React.JSX.Element {
  const t = useTranslations("auth.instructorSignup");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<InstructorSignupInput>({
    resolver: zodResolver(instructorSignupSchema),
    defaultValues: { token, full_name: defaultFullName, password: "" },
  });

  useEffect(() => {
    if (initialError) toast.error(initialError);
  }, [initialError]);

  const onPasswordSubmit = async (
    data: InstructorSignupInput,
  ): Promise<void> => {
    setIsLoading(true);
    const res = await fetch("/api/auth/instructor-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(body?.error ?? t("errorCreate"));
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (signInError) {
      toast.error(t("errorAutoLogin"));
      router.push("/login");
      return;
    }

    toast.success(t("successCreated"));
    router.push("/instructor");
    router.refresh();
  };

  const onGoogleSignup = async (): Promise<void> => {
    setIsLoading(true);
    const supabase = createClient();
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    callbackUrl.searchParams.set("invite_token", token);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
    if (error) {
      toast.error(t("errorGoogle"));
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">{t("labelEmail")}</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("emailLockedNote")}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={onGoogleSignup}
        disabled={isLoading}
      >
        <GoogleIcon />
        {t("continueWithGoogle")}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">
            {t("or")}
          </span>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onPasswordSubmit)}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="full_name">{t("labelFullName")}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="full_name"
              type="text"
              placeholder={t("placeholderFullName")}
              className="pl-10"
              {...form.register("full_name")}
            />
          </div>
          {form.formState.errors.full_name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.full_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("labelPassword")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              type="password"
              placeholder={t("placeholderPassword")}
              className="pl-10"
              {...form.register("password")}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? t("submitting") : t("submit")}
          {!isLoading && <ArrowRight className="ml-1 h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
