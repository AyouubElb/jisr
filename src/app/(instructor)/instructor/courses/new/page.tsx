"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCourseSchema, type CreateCourseInput } from "@/lib/schemas/course.schema";
import { useCreateCourse } from "@/lib/hooks/useCourses";
import { CEFR_LEVELS, LEVEL_LABELS } from "@/lib/constants/levels";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewCoursePage(): React.JSX.Element {
  const router = useRouter();
  const { mutate: createCourse, isPending } = useCreateCourse();

  const form = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: { title: "", description: "", level: undefined },
  });

  const selectedLevel = form.watch("level");

  const onSubmit = async (data: CreateCourseInput): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    createCourse(
      { ...data, instructor_id: user.id, is_published: false },
      { onSuccess: (result) => router.push(`/instructor/courses/${result.id}`) }
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/instructor/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau cours</h1>
          <p className="text-muted-foreground">Creez un nouveau cours pour vos etudiants</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details du cours</CardTitle>
          <CardDescription>
            Remplissez les informations de base. Vous pourrez ajouter des lecons et des sessions apres la creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du cours</Label>
              <Input
                id="title"
                placeholder="ex: English for Beginners"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Decrivez le contenu et les objectifs du cours..."
                rows={4}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Niveau</Label>
              <Select
                value={selectedLevel}
                onValueChange={(value) => form.setValue("level", value as CreateCourseInput["level"])}
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder="Selectionner un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level} — {LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.level && (
                <p className="text-xs text-destructive">{form.formState.errors.level.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creation..." : "Creer le cours"}
              </Button>
              <Link href="/instructor/courses">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
