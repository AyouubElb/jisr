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
import { useMyAIUsage } from "@/lib/hooks/useAIUsage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Lock, Sparkles, User } from "lucide-react";
import type { AIFeature } from "@/lib/ai/types";

const FEATURE_LABELS: Record<AIFeature, string> = {
  quiz_gen: "Quiz generations",
  quiz_edit: "Quiz edits (AI)",
  quiz_judge: "Internal evaluations",
  free_text_grade: "Free-text grading",
  voice_grade: "Voice grading",
  intervention_suggest: "Intervention suggestions",
  lesson_outline: "Lesson outlines",
  lesson_edit: "Lesson edits (AI)",
  lesson_gen: "Lesson generations",
  lesson_tts: "Lesson audio (TTS)",
};

// Hidden from the UI — internal/system features that aren't user-driven.
const HIDDEN_FEATURES: AIFeature[] = ["quiz_judge"];


export default function InstructorSettingsPage(): React.JSX.Element {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: authUser, isLoading: userLoading } = useCurrentUser();
  const { mutate: updatePassword, isPending: isPasswordPending } =
    useUpdatePassword();
  const { data: usage, isLoading: usageLoading } = useMyAIUsage();

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

  // Tint the bar red over 90%, amber over 70%, primary otherwise.
  const usageBarTint =
    usage && usage.percent >= 90
      ? "bg-rose-500"
      : usage && usage.percent >= 70
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-amber-950">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your profile, security, and AI usage
          </p>
        </div>

        <Separator />

        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1 gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex-1 gap-2">
              <Sparkles className="h-4 w-4" />
              AI usage
            </TabsTrigger>
          </TabsList>

          {/* ── Profil ── */}
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Personal information
                </CardTitle>
                <CardDescription>
                  Your instructor account information.
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
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        value={profile?.full_name ?? ""}
                        disabled
                        className="bg-muted/40 text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        To change your name, contact the administrator.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Email address</Label>
                      <Input
                        value={authUser?.email ?? ""}
                        disabled
                        className="bg-muted/40 text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        The email address cannot be changed.
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
                <CardTitle className="text-base">Password</CardTitle>
                <CardDescription>
                  Choose a strong password with at least 8 characters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        className="pr-10"
                        {...passwordForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide" : "Show"}
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
                    <Label htmlFor="confirm-password">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repeat the password"
                        className="pr-10"
                        {...passwordForm.register("confirm")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showConfirm ? "Hide" : "Show"}
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
                    {isPasswordPending
                      ? "Updating..."
                      : "Update password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Utilisation IA ── */}
          <TabsContent value="usage" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly budget</CardTitle>
                <CardDescription>
                  Renewed on the 1st of each month. Current plan:{" "}
                  <span className="font-medium capitalize">
                    {usage?.tier ?? "—"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading || !usage ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ) : usage.budgetCents === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No AI budget included in your current plan.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold tracking-tight">
                        {usage.percent}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        used this month
                      </span>
                    </div>
                    <Progress
                      value={usage.percent}
                      indicatorClassName={usageBarTint}
                    />
                    {usage.percent >= 90 && (
                      <p className="text-xs text-rose-600">
                        You are approaching your monthly limit. Generations
                        will be blocked once 100% is reached.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Breakdown by feature
                </CardTitle>
                <CardDescription>
                  Monthly counters for each AI action.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading || !usage ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {(
                      Object.entries(usage.byFeature) as [
                        AIFeature,
                        { used: number; limit: number },
                      ][]
                    )
                      .filter(([feature]) => !HIDDEN_FEATURES.includes(feature))
                      .map(([feature, { used, limit }]) => {
                        const pct =
                          limit > 0
                            ? Math.min(100, Math.round((used / limit) * 100))
                            : 0;
                        const tint =
                          pct >= 90
                            ? "bg-rose-500"
                            : pct >= 70
                              ? "bg-amber-500"
                              : "bg-primary";
                        return (
                          <li key={feature} className="space-y-1.5">
                            <div className="flex items-baseline justify-between text-sm">
                              <span className="font-medium">
                                {FEATURE_LABELS[feature]}
                              </span>
                              <span className="text-muted-foreground">
                                {used} / {limit}
                              </span>
                            </div>
                            <Progress value={pct} indicatorClassName={tint} />
                          </li>
                        );
                      })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
