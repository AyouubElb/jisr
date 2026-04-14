"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { useCourse } from "@/lib/hooks/useCourses";
import { useMyEnrollments } from "@/lib/hooks/useEnrollments";
import {
  useMyCompletions,
  useMarkLessonComplete,
  useUnmarkLessonComplete,
} from "@/lib/hooks/useCompletions";
import { LEVEL_BADGE_COLORS, LEVEL_LABELS } from "@/lib/constants/levels";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { CEFRLevel, SectionWithContent } from "@/lib/types";

export default function StudentCourseDetailPage(): React.JSX.Element {
  const params = useParams();
  const courseId = params.id as string;

  const { data: course, isLoading } = useCourse(courseId);
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [openItem, setOpenItem] = useState<string | null>(null);

  const isEnrolled = enrollments?.some((e) => e.courses?.id === courseId) ?? false;
  const { data: completions } = useMyCompletions(isEnrolled ? courseId : "");
  const { mutate: markComplete, isPending: markPending } = useMarkLessonComplete(courseId);
  const { mutate: unmarkComplete, isPending: unmarkPending } = useUnmarkLessonComplete(courseId);
  const completedLessonIds = new Set(completions?.map((c) => c.lesson_id) ?? []);

  const toggleSection = (id: string): void => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading || enrollLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-lg text-muted-foreground">Cours introuvable</p>
        <Link href="/student/courses">
          <Button variant="outline">Retour aux cours</Button>
        </Link>
      </div>
    );
  }

  const totalLessons = course.sections?.reduce((acc, s) => acc + (s.lessons?.length ?? 0), 0) ?? 0;
  const totalExercises = course.sections?.reduce((acc, s) => acc + (s.exercises?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/student/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-amber-950">{course.title}</h1>
            <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
              {course.level} — {LEVEL_LABELS[course.level as CEFRLevel]}
            </Badge>
          </div>
          <p className="text-muted-foreground">par {course.profiles.full_name}</p>
        </div>
      </div>

      <p className="text-muted-foreground">{course.description}</p>

      <Separator />

      {/* Content — only visible if enrolled */}
      {!isEnrolled ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-amber-950">Contenu reserve aux inscrits</p>
            <p className="text-muted-foreground">
              Ce cours contient {course.sections?.length ?? 0} section{(course.sections?.length ?? 0) > 1 ? "s" : ""},{" "}
              {totalLessons} lecon{totalLessons > 1 ? "s" : ""} et{" "}
              {totalExercises} exercice{totalExercises > 1 ? "s" : ""}.
              Contactez votre instructeur pour etre inscrit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">
              <BookOpen className="mr-2 h-4 w-4" />
              Contenu ({course.sections?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Calendar className="mr-2 h-4 w-4" />
              Sessions ({course.live_sessions?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* CONTENT */}
          <TabsContent value="content" className="space-y-4">
            {!course.sections?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucun contenu disponible pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {course.sections.map((section: SectionWithContent, sIndex: number) => (
                  <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Section header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSection(section.id)}
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {sIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-amber-950">{section.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {section.lessons?.length ?? 0} lecon{(section.lessons?.length ?? 0) !== 1 ? "s" : ""} · {section.exercises?.length ?? 0} exercice{(section.exercises?.length ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {expandedSections.has(section.id) && (
                      <div className="border-t border-border">
                        {/* Lessons */}
                        {section.lessons?.length > 0 && (
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                              Lecons
                            </p>
                            {section.lessons.map((lesson, lIndex) => {
                              const isDone = completedLessonIds.has(lesson.id);
                              return (
                              <div key={lesson.id}>
                                <div
                                  className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() =>
                                    setOpenItem(openItem === lesson.id ? null : lesson.id)
                                  }
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                  ) : (
                                    <BookOpen className="h-4 w-4 shrink-0 text-primary/60" />
                                  )}
                                  <span className="text-xs text-muted-foreground font-medium w-5">
                                    {lIndex + 1}.
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                                      {lesson.title}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {lesson.type === "grammar" ? "Grammaire" : lesson.type === "vocabulary" ? "Vocabulaire" : "Ressource"}
                                  </Badge>
                                  {openItem === lesson.id ? (
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                </div>
                                {openItem === lesson.id && lesson.content && (
                                  <div className="ml-12 mt-1 rounded-lg border border-border/50 bg-background p-4 space-y-3">
                                    <RichTextViewer content={lesson.content} />
                                    <div className="flex justify-end border-t border-border/40 pt-3">
                                      {isDone ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={unmarkPending}
                                          onClick={() => unmarkComplete(lesson.id)}
                                          className="text-muted-foreground"
                                        >
                                          <Check className="mr-2 h-4 w-4 text-emerald-600" />
                                          Termine — annuler
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={markPending}
                                          onClick={() => markComplete(lesson.id)}
                                        >
                                          <Check className="mr-2 h-4 w-4" />
                                          Marquer comme termine
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Exercises */}
                        {section.exercises?.length > 0 && (
                          <div className="px-4 py-3 space-y-2 border-t border-border/50">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                              Exercices
                            </p>
                            {section.exercises.map((exercise, eIndex) => (
                              <div key={exercise.id}>
                                <div
                                  className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() =>
                                    setOpenItem(openItem === exercise.id ? null : exercise.id)
                                  }
                                >
                                  <Dumbbell className="h-4 w-4 shrink-0 text-orange-500/60" />
                                  <span className="text-xs text-muted-foreground font-medium w-5">
                                    {eIndex + 1}.
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{exercise.title}</p>
                                  </div>
                                  {openItem === exercise.id ? (
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                </div>
                                {openItem === exercise.id && exercise.content && (
                                  <div className="ml-12 mt-1 rounded-lg border border-border/50 bg-background p-4">
                                    <RichTextViewer content={exercise.content} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quizzes */}
                        {section.quizzes?.length > 0 && (
                          <div className="px-4 py-3 space-y-2 border-t border-border/50">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                              Quizz
                            </p>
                            {section.quizzes.map((quiz, qIndex) => {
                              const questionCount = quiz.quiz_blocks.filter(
                                (b) => b.type === "mcq" || b.type === "fill_blank" || b.type === "free_text",
                              ).length;
                              return (
                                <Link
                                  key={quiz.id}
                                  href={`/student/courses/${courseId}/quizzes/${quiz.id}`}
                                  className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                                >
                                  <ClipboardList className="h-4 w-4 shrink-0 text-purple-500/70" />
                                  <span className="text-xs text-muted-foreground font-medium w-5">
                                    {qIndex + 1}.
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{quiz.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {questionCount} question{questionCount !== 1 ? "s" : ""}
                                      {quiz.time_limit_minutes && ` · ${quiz.time_limit_minutes} min`}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        {!section.lessons?.length && !section.exercises?.length && !section.quizzes?.length && (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                              Aucun contenu dans cette section
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SESSIONS */}
          <TabsContent value="sessions" className="space-y-4">
            {!course.live_sessions?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <Calendar className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune session planifiee</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {course.live_sessions.map((session) => {
                  const sessionDate = new Date(session.scheduled_at);
                  const isPast = sessionDate < new Date();

                  return (
                    <Card key={session.id} className={isPast ? "opacity-60" : ""}>
                      <CardContent className="flex items-center justify-between pt-6">
                        <div>
                          <p className="font-medium">{session.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(sessionDate, "EEEE d MMMM yyyy 'a' HH:mm", { locale: fr })}
                            {" · "}{session.duration_minutes} min
                          </p>
                        </div>
                        {!isPast && (
                          <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm">Rejoindre</Button>
                          </a>
                        )}
                        {isPast && <Badge variant="secondary">Terminee</Badge>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
