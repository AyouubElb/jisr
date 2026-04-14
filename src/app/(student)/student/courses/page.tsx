"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/lib/hooks/useCourses";
import { CEFR_LEVELS, LEVEL_LABELS, LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CEFRLevel } from "@/lib/types";

export default function StudentCoursesPage(): React.JSX.Element {
  const [levelFilter, setLevelFilter] = useState<CEFRLevel | undefined>(undefined);
  const { data: courses, isLoading } = useCourses(levelFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cours disponibles</h1>
          <p className="text-muted-foreground">Parcourez et inscrivez-vous aux cours</p>
        </div>
        <Select
          value={levelFilter ?? "all"}
          onValueChange={(v) => setLevelFilter(v === "all" ? undefined : v as CEFRLevel)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par niveau" />
          </SelectTrigger>
          <SelectContent>
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !courses?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Aucun cours disponible</p>
            <p className="text-muted-foreground">
              {levelFilter
                ? "Aucun cours pour ce niveau. Essayez un autre filtre."
                : "Les cours seront bientot disponibles."}
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
            <Link key={course.id} href={`/student/courses/${course.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
                      {course.level}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 text-lg">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    par {course.profiles.full_name}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
