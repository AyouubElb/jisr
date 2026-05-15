"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCourses } from "@/lib/hooks/useCourses";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import type { CEFRLevel } from "@/lib/types";

export default function InstructorCoursesPage(): React.JSX.Element {
  const { data: courses, isLoading } = useMyCourses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My courses</h1>
          <p className="text-muted-foreground">Manage and organize your courses</p>
        </div>
        <Link href="/instructor/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New course
          </Button>
        </Link>
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
            <p className="text-lg font-medium">No courses yet</p>
            <p className="text-muted-foreground">Start by creating your first course</p>
            <Link href="/instructor/courses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create a course
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/instructor/courses/${course.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
                      {course.level}
                    </Badge>
                    <Badge variant={course.is_published ? "default" : "secondary"}>
                      {course.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-semibold">{course.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {course.description}
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
