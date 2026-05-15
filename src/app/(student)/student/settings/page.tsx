"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/lib/schemas/auth.schema";
import {
  useProfile,
  useCurrentUser,
  useUpdatePassword,
} from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, EyeOff, Lock, User } from "lucide-react";

export default function StudentSettingsPage(): React.JSX.Element {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: authUser, isLoading: userLoading } = useCurrentUser();
  const { mutate: updatePassword, isPending: isPasswordPending } = useUpdatePassword();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordForm = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onPasswordSubmit = (data: UpdatePasswordInput): void => {
    updatePassword(
      { password: data.password },
      { onSuccess: () => passwordForm.reset() },
    );
  };

  const isLoading = profileLoading || userLoading;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-amber-950">Parametres</h1>
          <p className="text-muted-foreground">Gerez votre profil et votre securite</p>
        </div>

        <Separator />

        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1 gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 gap-2">
              <Lock className="h-4 w-4" />
              Securite
            </TabsTrigger>
          </TabsList>

          {/* ── Profil ── */}
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations personnelles</CardTitle>
                <CardDescription>
                  Vos informations de compte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Nom complet</Label>
                      <Input
                        id="full_name"
                        value={profile?.full_name ?? ""}
                        disabled
                        className="bg-muted/40 text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        Pour modifier votre nom, contactez votre instructeur.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Adresse e-mail</Label>
                      <Input
                        value={authUser?.email ?? ""}
                        disabled
                        className="bg-muted/40 text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        L&apos;adresse e-mail ne peut pas etre modifiee.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Securite ── */}
          <TabsContent value="security" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mot de passe</CardTitle>
                <CardDescription>
                  Choisissez un mot de passe fort avec au moins 8 caracteres.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 8 caracteres"
                        className="pr-10"
                        {...passwordForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? "Masquer" : "Afficher"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repetez le mot de passe"
                        className="pr-10"
                        {...passwordForm.register("confirm")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showConfirm ? "Masquer" : "Afficher"}
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.confirm && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.confirm.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={isPasswordPending}>
                    {isPasswordPending ? "Mise a jour..." : "Mettre a jour le mot de passe"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
