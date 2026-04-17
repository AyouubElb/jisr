"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LessonDialog } from "@/components/course/lesson-dialog";
import { ExerciseDialog } from "@/components/course/exercise-dialog";
import { QuizDialog } from "@/components/course/quiz-dialog";
import { QuizPreviewModal } from "@/components/course/quiz-preview-modal";
import { SectionDialog } from "@/components/course/section-dialog";
import { SessionDialog } from "@/components/course/session-dialog";
import { AddStudentDialog } from "@/components/course/add-student-dialog";
import { AttendanceDialog } from "@/components/course/attendance-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCourse,
  useUpdateCourse,
  useDeleteCourse,
} from "@/lib/hooks/useCourses";
import { useSections, useDeleteSection } from "@/lib/hooks/useSections";
import { useDeleteLesson } from "@/lib/hooks/useLessons";
import { useDeleteExercise } from "@/lib/hooks/useExercises";
import { useDeleteQuiz, useDuplicateQuiz } from "@/lib/hooks/useQuizzes";
import { useDeleteSession } from "@/lib/hooks/useSessions";
import {
  useCourseEnrollments,
  useRemoveStudent,
} from "@/lib/hooks/useEnrollments";
import {
  CEFR_LEVELS,
  LEVEL_LABELS,
  LEVEL_BADGE_COLORS,
} from "@/lib/constants/levels";
import {
  createCourseSchema,
  type CreateCourseInput,
} from "@/lib/schemas/course.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Dumbbell,
  ClipboardCheck,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  GraduationCap,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type {
  CEFRLevel,
  Exercise,
  Lesson,
  QuizWithBlocks,
  SectionWithContent,
} from "@/lib/types";

type LessonDialogState =
  | { mode: "create"; sectionId: string; nextOrder: number }
  | null;

type ExerciseDialogState =
  | { mode: "create"; sectionId: string; nextOrder: number }
  | { mode: "edit"; exercise: Exercise }
  | null;

type QuizDialogState =
  | { mode: "create"; sectionId: string; nextOrder: number }
  | null;

export default function InstructorCourseDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { data: course, isLoading } = useCourse(courseId);
  const { data: sections } = useSections(courseId);
  const { mutate: updateCourse, isPending: isUpdating } = useUpdateCourse();
  const { mutate: deleteCourse } = useDeleteCourse();
  const { mutate: deleteSection } = useDeleteSection(courseId);
  const { mutate: deleteLesson } = useDeleteLesson(courseId);
  const { mutate: deleteExercise } = useDeleteExercise(courseId);
  const { mutate: deleteQuiz } = useDeleteQuiz(courseId);
  const { mutate: duplicateQuiz } = useDuplicateQuiz(courseId);
  const { mutate: deleteSession } = useDeleteSession(courseId);
  const { data: enrollments } = useCourseEnrollments(courseId);
  const { mutate: removeStudent } = useRemoveStudent();

  const [lessonDialog, setLessonDialog] = useState<LessonDialogState>(null);
  const [exerciseDialog, setExerciseDialog] = useState<ExerciseDialogState>(null);
  const [quizDialog, setQuizDialog] = useState<QuizDialogState>(null);
  const [previewQuizId, setPreviewQuizId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const toggleSection = (id: string): void => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const editForm = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    values: course
      ? {
          title: course.title,
          description: course.description,
          level: course.level as CreateCourseInput["level"],
        }
      : undefined,
  });
  const editLevel = editForm.watch("level");

  const onEditSubmit = (data: CreateCourseInput): void => {
    updateCourse({ id: courseId, updates: data });
  };

  const onTogglePublish = (): void => {
    if (!course) return;
    updateCourse({
      id: courseId,
      updates: { is_published: !course.is_published },
    });
  };

  const onDeleteCourse = (): void => {
    setConfirmDialog({
      title: "Supprimer ce cours",
      description: "Cette action est irreversible. Toutes les sections, lecons, exercices et sessions associes seront supprimes.",
      confirmLabel: "Supprimer le cours",
      onConfirm: () =>
        deleteCourse(courseId, {
          onSuccess: () => router.push("/instructor/courses"),
        }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-lg text-muted-foreground">Cours introuvable</p>
        <Link href="/instructor/courses">
          <Button variant="outline">Retour aux cours</Button>
        </Link>
      </div>
    );
  }

  const lessonTypeLabel = (type: string): string =>
    type === "grammar"
      ? "Grammaire"
      : type === "vocabulary"
        ? "Vocabulaire"
        : "Ressource";

  const totalLessons = sections?.reduce((acc, s) => acc + (s.lessons?.length ?? 0), 0) ?? 0;
  const totalExercises = sections?.reduce((acc, s) => acc + (s.exercises?.length ?? 0), 0) ?? 0;
  const totalQuizzes = sections?.reduce((acc, s) => acc + (s.quizzes?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-amber-950">
                {course.title}
              </h1>
              <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
                {course.level} — {LEVEL_LABELS[course.level as CEFRLevel]}
              </Badge>
              <Badge
                variant={course.is_published ? "default" : "secondary"}
                className="capitalize"
              >
                {course.is_published ? "Publie" : "Brouillon"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {course.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePublish}
            disabled={isUpdating}
          >
            {course.is_published ? (
              <>
                <EyeOff className="mr-1.5 h-4 w-4" />
                Depublier
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-4 w-4" />
                Publier
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <Tabs defaultValue="content">
        <TabsList className="w-full justify-start gap-1 rounded-xl border border-border bg-muted/40 p-2">
          <TabsTrigger
            value="content"
            className="gap-2 rounded-lg px-5 py-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BookOpen className="h-4 w-4" />
            <span>Contenu</span>
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {sections?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="gap-2 rounded-lg px-5 py-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Calendar className="h-4 w-4" />
            <span>Sessions</span>
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {course.live_sessions?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="gap-2 rounded-lg px-5 py-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4" />
            <span>Etudiants</span>
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {enrollments?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-2 rounded-lg px-5 py-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span>Parametres</span>
          </TabsTrigger>
        </TabsList>

        {/* ── CONTENT (Sections → Lessons + Exercises) ─────────────── */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-950">Contenu du cours</p>
              <p className="text-sm text-muted-foreground">
                {sections?.length ?? 0} section{(sections?.length ?? 0) !== 1 ? "s" : ""} · {totalLessons} lecon{totalLessons !== 1 ? "s" : ""} · {totalExercises} exercice{totalExercises !== 1 ? "s" : ""} · {totalQuizzes} quiz{totalQuizzes !== 1 ? "s" : ""}
              </p>
            </div>
            <SectionDialog
              courseId={courseId}
              nextOrder={(sections?.length ?? 0) + 1}
              trigger={
                <Button>
                  <FolderPlus className="mr-1.5 h-4 w-4" />
                  Ajouter une section
                </Button>
              }
            />
          </div>

          {/* Lesson create dialog (edit is a dedicated page) */}
          {lessonDialog && (
            <LessonDialog
              open
              onOpenChange={(open) => {
                if (!open) setLessonDialog(null);
              }}
              courseId={courseId}
              sectionId={lessonDialog.sectionId}
              nextOrder={lessonDialog.nextOrder}
            />
          )}

          {/* Exercise dialog (create + edit) */}
          {exerciseDialog &&
            (exerciseDialog.mode === "create" ? (
              <ExerciseDialog
                open
                onOpenChange={(open) => {
                  if (!open) setExerciseDialog(null);
                }}
                courseId={courseId}
                mode="create"
                sectionId={exerciseDialog.sectionId}
                nextOrder={exerciseDialog.nextOrder}
              />
            ) : (
              <ExerciseDialog
                open
                onOpenChange={(open) => {
                  if (!open) setExerciseDialog(null);
                }}
                courseId={courseId}
                mode="edit"
                exercise={exerciseDialog.exercise}
              />
            ))}

          {/* Quiz create dialog (edit is a dedicated page) */}
          {quizDialog && (
            <QuizDialog
              open
              onOpenChange={(open) => {
                if (!open) setQuizDialog(null);
              }}
              courseId={courseId}
              sectionId={quizDialog.sectionId}
              nextOrder={quizDialog.nextOrder}
            />
          )}

          <QuizPreviewModal
            quizId={previewQuizId}
            onClose={() => setPreviewQuizId(null)}
          />

          {/* Sections list */}
          {!sections?.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-amber-950">
                    Aucune section pour le moment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Creez votre premiere section pour organiser le contenu
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sections.map((section, sIndex) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={sIndex}
                  expanded={expandedSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  onAddLesson={() =>
                    setLessonDialog({
                      mode: "create",
                      sectionId: section.id,
                      nextOrder: (section.lessons?.length ?? 0) + 1,
                    })
                  }
                  onAddExercise={() =>
                    setExerciseDialog({
                      mode: "create",
                      sectionId: section.id,
                      nextOrder: (section.exercises?.length ?? 0) + 1,
                    })
                  }
                  onEditLesson={(lesson) =>
                    router.push(
                      `/instructor/courses/${courseId}/lessons/${lesson.id}/edit`,
                    )
                  }
                  onEditExercise={(exercise) =>
                    setExerciseDialog({ mode: "edit", exercise })
                  }
                  onDeleteLesson={(id) =>
                    setConfirmDialog({
                      title: "Supprimer cette lecon",
                      description: "Le contenu et les documents associes seront supprimes.",
                      onConfirm: () => deleteLesson(id),
                    })
                  }
                  onDeleteExercise={(id) =>
                    setConfirmDialog({
                      title: "Supprimer cet exercice",
                      description: "Le contenu et les documents associes seront supprimes.",
                      onConfirm: () => deleteExercise(id),
                    })
                  }
                  onAddQuiz={() =>
                    setQuizDialog({
                      mode: "create",
                      sectionId: section.id,
                      nextOrder: (section.quizzes?.length ?? 0) + 1,
                    })
                  }
                  onPreviewQuiz={(quiz) => setPreviewQuizId(quiz.id)}
                  onEditQuiz={(quiz) =>
                    router.push(`/instructor/courses/${courseId}/quizzes/${quiz.id}/edit`)
                  }
                  onDuplicateQuiz={(quiz) =>
                    duplicateQuiz({
                      id: quiz.id,
                      nextOrder: (section.quizzes?.length ?? 0) + 1,
                    })
                  }
                  onDeleteQuiz={(id) =>
                    setConfirmDialog({
                      title: "Supprimer ce quiz",
                      description: "Toutes les questions et les tentatives des etudiants seront supprimees.",
                      onConfirm: () => deleteQuiz(id),
                    })
                  }
                  onDeleteSection={() =>
                    setConfirmDialog({
                      title: "Supprimer cette section",
                      description: "Toutes les lecons, exercices et quiz de cette section seront supprimes.",
                      confirmLabel: "Supprimer la section",
                      onConfirm: () => deleteSection(section.id),
                    })
                  }
                  lessonTypeLabel={lessonTypeLabel}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SESSIONS ─────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-950">Sessions en direct</p>
              <p className="text-sm text-muted-foreground">
                {course.live_sessions?.length ?? 0} session
                {(course.live_sessions?.length ?? 0) !== 1 ? "s" : ""} planifiee
                {(course.live_sessions?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <SessionDialog
              courseId={courseId}
              trigger={
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Planifier une session
                </Button>
              }
            />
          </div>

          {!course.live_sessions?.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-amber-950">
                    Aucune session planifiee
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Planifiez votre premiere session en direct
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {course.live_sessions.map((session) => {
                const sessionDate = new Date(session.scheduled_at);
                const isPast = sessionDate < new Date();
                return (
                  <div
                    key={session.id}
                    className={`flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30 ${isPast ? "opacity-60" : ""}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-xs font-bold leading-none">
                        {format(sessionDate, "d")}
                      </span>
                      <span className="text-[10px] uppercase leading-none">
                        {format(sessionDate, "MMM", { locale: fr })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{session.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(sessionDate, "HH:mm")} ·{" "}
                          {session.duration_minutes} min
                        </span>
                        {isPast && (
                          <Badge variant="secondary" className="text-[10px]">
                            Terminee
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!isPast && (
                        <a
                          href={session.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Lien
                          </Button>
                        </a>
                      )}
                      {isPast && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setAttendanceSession({ id: session.id, title: session.title })
                          }
                        >
                          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                          Presence
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setConfirmDialog({
                            title: "Supprimer cette session",
                            description: "La session sera definitivement supprimee.",
                            onConfirm: () => deleteSession(session.id),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── STUDENTS ─────────────────────────────────────────────── */}
        <TabsContent value="students" className="mt-4 space-y-4">
          {!course.is_published && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">
                  Ce cours est en brouillon
                </p>
                <p className="text-amber-800">
                  Publiez le cours avant de pouvoir inscrire des etudiants.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-950">Etudiants inscrits</p>
              <p className="text-sm text-muted-foreground">
                {enrollments?.length ?? 0} etudiant
                {(enrollments?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <AddStudentDialog
              courseId={courseId}
              isPublished={course.is_published}
              trigger={
                <Button>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Ajouter un etudiant
                </Button>
              }
            />
          </div>

          {!enrollments?.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <GraduationCap className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-amber-950">
                    Aucun etudiant inscrit
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {course.is_published
                      ? "Ajoutez des etudiants pour qu'ils accedent au cours"
                      : "Publiez d'abord le cours pour pouvoir inscrire des etudiants"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {enrollment.profiles.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {enrollment.profiles.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inscrit le{" "}
                      {format(new Date(enrollment.enrolled_at), "d MMMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      removeStudent({
                        courseId,
                        studentId: enrollment.student_id,
                      })
                    }
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SETTINGS ─────────────────────────────────────────────── */}
        <TabsContent value="settings" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-amber-950">
                Modifier le cours
              </CardTitle>
              <CardDescription>
                Mettez a jour les informations de base du cours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={editForm.handleSubmit(onEditSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input {...editForm.register("title")} />
                  {editForm.formState.errors.title && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea rows={4} {...editForm.register("description")} />
                  {editForm.formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.description.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Niveau CECRL</Label>
                  <Select
                    value={editLevel}
                    onValueChange={(v) =>
                      editForm.setValue(
                        "level",
                        v as CreateCourseInput["level"],
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CEFR_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level} — {LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">
                Zone dangereuse
              </CardTitle>
              <CardDescription>
                Ces actions sont irreversibles. Procedez avec precaution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={onDeleteCourse}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer definitivement ce cours
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={confirmDialog?.onConfirm ?? (() => {})}
      />

      {attendanceSession && (
        <AttendanceDialog
          sessionId={attendanceSession.id}
          courseId={courseId}
          sessionTitle={attendanceSession.title}
          open={!!attendanceSession}
          onOpenChange={(open) => { if (!open) setAttendanceSession(null); }}
        />
      )}
    </div>
  );
}

/* ── Section Card Component ───────────────────────────────────────────── */

function SectionCard({
  section,
  index,
  expanded,
  onToggle,
  onAddLesson,
  onAddExercise,
  onAddQuiz,
  onEditLesson,
  onEditExercise,
  onPreviewQuiz,
  onEditQuiz,
  onDuplicateQuiz,
  onDeleteLesson,
  onDeleteExercise,
  onDeleteQuiz,
  onDeleteSection,
  lessonTypeLabel,
}: {
  section: SectionWithContent;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onAddLesson: () => void;
  onAddExercise: () => void;
  onAddQuiz: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onEditExercise: (exercise: Exercise) => void;
  onPreviewQuiz: (quiz: QuizWithBlocks) => void;
  onEditQuiz: (quiz: QuizWithBlocks) => void;
  onDuplicateQuiz: (quiz: QuizWithBlocks) => void;
  onDeleteLesson: (id: string) => void;
  onDeleteExercise: (id: string) => void;
  onDeleteQuiz: (id: string) => void;
  onDeleteSection: () => void;
  lessonTypeLabel: (type: string) => string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Section header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-950">{section.title}</p>
          <p className="text-xs text-muted-foreground">
            {section.lessons?.length ?? 0} lecon{(section.lessons?.length ?? 0) !== 1 ? "s" : ""} · {section.exercises?.length ?? 0} exercice{(section.exercises?.length ?? 0) !== 1 ? "s" : ""} · {section.quizzes?.length ?? 0} quiz{(section.quizzes?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onAddLesson}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Lecon
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onAddExercise}
          >
            <Dumbbell className="h-3.5 w-3.5" />
            Exercice
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onAddQuiz}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Quiz
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDeleteSection}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded content — interleaved timeline (lessons + exercises + quizzes sorted by order) */}
      {expanded && (
        <div className="border-t border-border">
          {(() => {
            type TimelineItem =
              | { kind: "lesson"; order: number; lesson: Lesson }
              | { kind: "exercise"; order: number; exercise: Exercise }
              | { kind: "quiz"; order: number; quiz: QuizWithBlocks };

            const items: TimelineItem[] = [
              ...(section.lessons ?? []).map<TimelineItem>((l) => ({
                kind: "lesson",
                order: l.order,
                lesson: l,
              })),
              ...(section.exercises ?? []).map<TimelineItem>((e) => ({
                kind: "exercise",
                order: e.order,
                exercise: e,
              })),
              ...(section.quizzes ?? []).map<TimelineItem>((q) => ({
                kind: "quiz",
                order: q.order,
                quiz: q,
              })),
            ].sort((a, b) => a.order - b.order);

            if (items.length === 0) return null;

            return (
              <div className="px-4 py-3 space-y-1.5">
                {items.map((item, idx) => {
                  if (item.kind === "lesson") {
                    const lesson = item.lesson;
                    return (
                      <div
                        key={`lesson-${lesson.id}`}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 group"
                      >
                        <BookOpen className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="text-xs text-muted-foreground font-medium w-5">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{lesson.title}</p>
                          <Badge variant="outline" className="mt-0.5 text-[10px]">
                            {lessonTypeLabel(lesson.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Modifier le contenu"
                            onClick={() => onEditLesson(lesson)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteLesson(lesson.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === "exercise") {
                    const exercise = item.exercise;
                    return (
                      <div
                        key={`exercise-${exercise.id}`}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 group"
                      >
                        <Dumbbell className="h-4 w-4 shrink-0 text-orange-500/60" />
                        <span className="text-xs text-muted-foreground font-medium w-5">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{exercise.title}</p>
                          <Badge variant="outline" className="mt-0.5 text-[10px]">
                            Exercice
                          </Badge>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Modifier le contenu"
                            onClick={() => onEditExercise(exercise)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteExercise(exercise.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  const quiz = item.quiz;
                  return (
                    <div
                      key={`quiz-${quiz.id}`}
                      className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 group"
                    >
                      <ClipboardList className="h-4 w-4 shrink-0 text-violet-500/60" />
                      <span className="text-xs text-muted-foreground font-medium w-5">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{quiz.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">
                            Quiz
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {quiz.quiz_blocks?.length ?? 0} bloc{(quiz.quiz_blocks?.length ?? 0) !== 1 ? "s" : ""}
                          </Badge>
                          {quiz.time_limit_minutes && (
                            <Badge variant="outline" className="text-[10px]">
                              {quiz.time_limit_minutes} min
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Apercu etudiant"
                          onClick={() => onPreviewQuiz(quiz)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Modifier le quiz"
                          onClick={() => onEditQuiz(quiz)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Dupliquer le quiz"
                          onClick={() => onDuplicateQuiz(quiz)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteQuiz(quiz.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Empty state inside section */}
          {!section.lessons?.length && !section.exercises?.length && !section.quizzes?.length && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Cette section est vide. Ajoutez des lecons, des exercices ou des quiz.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
