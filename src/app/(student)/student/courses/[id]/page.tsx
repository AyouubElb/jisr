"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourse } from "@/lib/hooks/useCourses";
import { useMyEnrollments } from "@/lib/hooks/useEnrollments";
import { useMyCompletions } from "@/lib/hooks/useCompletions";
import { useProfile } from "@/lib/hooks/useAuth";
import { useCourseQuestions } from "@/lib/hooks/useQuestions";
import { QuestionsPanel } from "@/components/course/questions-panel";
import { LEVEL_BADGE_COLORS, LEVEL_LABELS } from "@/lib/constants/levels";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lock,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { CEFRLevel, SectionWithContent } from "@/lib/types";

export default function StudentCourseDetailPage(): React.JSX.Element {
  const params = useParams();
  const courseId = params.id as string;

  const { data: course, isLoading } = useCourse(courseId);
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments();
  // null until the user has manually toggled a section — before that, the
  // default-expanded logic below drives the UI purely from derived state.
  const [userExpanded, setUserExpanded] = useState<Set<string> | null>(null);

  const isEnrolled =
    enrollments?.some((e) => e.courses?.id === courseId) ?? false;
  const { data: completions } = useMyCompletions(isEnrolled ? courseId : "");
  const completedLessonIds = useMemo(
    () => new Set(completions?.map((c) => c.lesson_id) ?? []),
    [completions],
  );

  // Default section to expand: first with incomplete lessons, fallback to last section
  const defaultExpandedId = useMemo(() => {
    if (!course?.sections || completions === undefined) return null;
    const active = course.sections.find((s) =>
      s.lessons?.some((l) => !completedLessonIds.has(l.id)),
    );
    return (
      active?.id ?? course.sections[course.sections.length - 1]?.id ?? null
    );
  }, [course, completions, completedLessonIds]);

  const expandedSections =
    userExpanded ??
    (defaultExpandedId ? new Set([defaultExpandedId]) : new Set<string>());

  const { data: profile } = useProfile();
  const { data: questions } = useCourseQuestions(isEnrolled ? courseId : "");
  const openQuestionsCount =
    questions?.filter((q) => q.status === "open").length ?? 0;

  const toggleSection = (id: string): void => {
    setUserExpanded((prev) => {
      const base =
        prev ??
        (defaultExpandedId ? new Set([defaultExpandedId]) : new Set<string>());
      const next = new Set(base);
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

  const totalLessons =
    course.sections?.reduce((acc, s) => acc + (s.lessons?.length ?? 0), 0) ?? 0;

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
          <h1 className="text-2xl font-bold tracking-tight text-amber-950">
            {course.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
              {course.level} — {LEVEL_LABELS[course.level as CEFRLevel]}
            </Badge>
            <p className="text-muted-foreground">
              par {course.profiles.full_name}
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground">{course.description}</p>

      <Separator />

      {/* Content — only visible if enrolled */}
      {!isEnrolled ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-amber-950">
              Contenu reserve aux inscrits
            </p>
            <p className="text-muted-foreground">
              Ce cours contient {course.sections?.length ?? 0} section
              {(course.sections?.length ?? 0) > 1 ? "s" : ""} et {totalLessons}{" "}
              lecon{totalLessons > 1 ? "s" : ""}. Contactez votre instructeur pour
              etre inscrit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="content">
          <TabsList className="w-full justify-start gap-1 rounded-xl border border-border bg-muted/40 p-2">
            <TabsTrigger
              value="content"
              className="gap-1.5 rounded-lg px-3 py-2 md:px-5 md:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
            >
              <BookOpen className="h-4 w-4" />
              <span>Contenu</span>
              <span className="hidden sm:inline ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                {course.sections?.length ?? 0}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="gap-1.5 rounded-lg px-3 py-2 md:px-5 md:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
            >
              <Calendar className="h-4 w-4" />
              <span>Sessions</span>
              <span className="hidden sm:inline ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                {course.live_sessions?.length ?? 0}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="questions"
              className="gap-1.5 rounded-lg px-3 py-2 md:px-5 md:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Questions</span>
              <span className="hidden sm:inline ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                {openQuestionsCount}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* CONTENT */}
          <TabsContent value="content" className="space-y-4">
            {!course.sections?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Aucun contenu disponible pour le moment
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {course.sections.map(
                  (section: SectionWithContent, sIndex: number) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
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
                          <p className="font-medium text-amber-950">
                            {section.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {section.lessons?.length ?? 0} lecon
                            {(section.lessons?.length ?? 0) !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      {/* Expanded content — interleaved timeline */}
                      {expandedSections.has(section.id) && (
                        <div className="border-t border-border">
                          {(() => {
                            type Lesson = SectionWithContent["lessons"][number];
                            type Quiz = SectionWithContent["quizzes"][number];
                            type TimelineItem =
                              | {
                                  kind: "lesson";
                                  order: number;
                                  lesson: Lesson;
                                }
                              | { kind: "quiz"; order: number; quiz: Quiz };

                            const items: TimelineItem[] = (
                              section.items ?? []
                            ).map<TimelineItem>((entry) =>
                              entry.item_type === "lesson"
                                ? {
                                    kind: "lesson",
                                    order: entry.position,
                                    lesson: entry.data,
                                  }
                                : {
                                    kind: "quiz",
                                    order: entry.position,
                                    quiz: entry.data,
                                  },
                            );

                            if (items.length === 0) {
                              return (
                                <div className="px-4 py-6 text-center">
                                  <p className="text-sm text-muted-foreground">
                                    Aucun contenu dans cette section
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="px-4 py-3 space-y-2">
                                {items.map((item, idx) => {
                                  if (item.kind === "lesson") {
                                    const lesson = item.lesson;
                                    const isDone = completedLessonIds.has(
                                      lesson.id,
                                    );
                                    return (
                                      <Link
                                        key={`lesson-${lesson.id}`}
                                        href={`/student/courses/${courseId}/lessons/${lesson.id}`}
                                        className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                                      >
                                        {isDone ? (
                                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                        ) : (
                                          <BookOpen className="h-4 w-4 shrink-0 text-primary/60" />
                                        )}
                                        <span className="text-xs text-muted-foreground font-medium w-5">
                                          {idx + 1}.
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <p
                                            className={`text-sm font-medium ${isDone ? "text-muted-foreground" : ""}`}
                                          >
                                            {lesson.title}
                                          </p>
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] shrink-0"
                                        >
                                          {lesson.type === "grammar"
                                            ? "Grammaire"
                                            : lesson.type === "vocabulary"
                                              ? "Vocabulaire"
                                              : "Ressource"}
                                        </Badge>
                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                      </Link>
                                    );
                                  }

                                  const quiz = item.quiz;
                                  const questionCount = quiz.quiz_blocks.filter(
                                    (b) =>
                                      b.type === "mcq" ||
                                      b.type === "fill_blank" ||
                                      b.type === "free_text",
                                  ).length;
                                  return (
                                    <Link
                                      key={`quiz-${quiz.id}`}
                                      href={`/student/courses/${courseId}/quizzes/${quiz.id}`}
                                      className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                                    >
                                      <ClipboardList className="h-4 w-4 shrink-0 text-purple-500/70" />
                                      <span className="text-xs text-muted-foreground font-medium w-5">
                                        {idx + 1}.
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">
                                          {quiz.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {questionCount} question
                                          {questionCount !== 1 ? "s" : ""}
                                          {quiz.time_limit_minutes &&
                                            ` · ${quiz.time_limit_minutes} min`}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] shrink-0"
                                      >
                                        Quiz
                                      </Badge>
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    </Link>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </TabsContent>

          {/* SESSIONS */}
          <TabsContent value="sessions" className="space-y-4">
            {!course.live_sessions?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <Calendar className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Aucune session planifiee
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {course.live_sessions.map((session) => {
                  const sessionDate = new Date(session.scheduled_at);
                  const isPast = sessionDate < new Date();

                  return (
                    <Card
                      key={session.id}
                      className={isPast ? "opacity-60" : ""}
                    >
                      <CardContent className="flex items-center justify-between pt-6">
                        <div>
                          <p className="font-medium">{session.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(sessionDate, "EEEE d MMMM yyyy 'a' HH:mm", {
                              locale: fr,
                            })}
                            {" · "}
                            {session.duration_minutes} min
                          </p>
                        </div>
                        {!isPast && (
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
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

          {/* QUESTIONS */}
          <TabsContent
            value="questions"
            className="w-full !overflow-x-hidden space-y-4"
          >
            {profile ? (
              <QuestionsPanel
                courseId={courseId}
                currentUserId={profile.id}
                role="student"
              />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
