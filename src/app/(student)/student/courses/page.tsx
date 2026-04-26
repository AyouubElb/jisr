"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses, useCourse } from "@/lib/hooks/useCourses";
import { useMyCompletions } from "@/lib/hooks/useCompletions";
import { CEFR_LEVELS, LEVEL_LABELS, LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { BookOpen, Play } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CEFRLevel, SectionWithContent } from "@/lib/types";

/** Shows a resume link to the first incomplete lesson in the course. */
function ResumeButton({ courseId }: { courseId: string }): React.JSX.Element | null {
  const { data: course } = useCourse(courseId);
  const { data: completions } = useMyCompletions(courseId);

  const resumeLesson = useMemo(() => {
    if (!course?.sections || completions === undefined) return null;
    const completedIds = new Set(completions.map((c) => c.lesson_id));
    for (const section of course.sections as SectionWithContent[]) {
      const sorted = [...(section.lessons ?? [])].sort((a, b) => a.order - b.order);
      for (const lesson of sorted) {
        if (!completedIds.has(lesson.id)) return lesson;
      }
    }
    return null;
  }, [course, completions]);

  if (!resumeLesson) return null;

  return (
    <Link href={`/student/courses/${courseId}/lessons/${resumeLesson.id}`}>
      <Button size="sm" variant="secondary" className="gap-1.5 hover:bg-primary hover:text-primary-foreground">
        <Play className="h-3 w-3" />
        Reprendre
      </Button>
    </Link>
  );
}

export default function StudentCoursesPage(): React.JSX.Element {
  const [levelFilter, setLevelFilter] = useState<CEFRLevel | undefined>(undefined);
  const { data: courses, isLoading } = useCourses(levelFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes cours</h1>
          <p className="text-muted-foreground">Les cours auxquels vous etes inscrit</p>
        </div>
        <Select
          value={levelFilter ?? "all"}
          onValueChange={(v) => setLevelFilter(v === "all" ? undefined : v as CEFRLevel)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrer par niveau" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="all">Tous les niveaux</SelectItem>
            {CEFR_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level} — {LEVEL_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !courses?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Aucun cours</p>
            <p className="text-muted-foreground text-center">
              {levelFilter
                ? "Aucun cours pour ce niveau. Essayez un autre filtre."
                : "Contactez votre instructeur pour etre inscrit a un cours."}
            </p>
            {levelFilter && (
              <Button variant="outline" onClick={() => setLevelFilter(undefined)}>
                Voir tous les niveaux
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="relative h-full transition-colors hover:bg-muted/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
                    {course.level}
                  </Badge>
                  <div className="relative z-10">
                    <ResumeButton courseId={course.id} />
                  </div>
                </div>
                <CardTitle className="mt-2 text-lg">
                  <Link
                    href={`/student/courses/${course.id}`}
                    className="after:absolute after:inset-0"
                  >
                    {course.title}
                  </Link>
                </CardTitle>
                <CardDescription className="line-clamp-2">{course.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  par {course.profiles.full_name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
