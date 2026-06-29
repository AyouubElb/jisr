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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LessonDialog } from "@/components/course/lesson/lesson-dialog";
import { QuizDialog } from "@/components/course/quiz/quiz-dialog";
import { QuizAIGenerateDialog } from "@/components/course/quiz/quiz-ai-generate-dialog";
import { QuizPreviewModal } from "@/components/course/quiz/quiz-preview-modal";
import { SectionDialog } from "@/components/course/shared/section-dialog";
import { SessionDialog } from "@/components/course/session/session-dialog";
import { AddStudentDialog } from "@/components/course/students/add-student-dialog";
import { AttendanceDialog } from "@/components/course/session/attendance-dialog";
import { QuestionsPanel } from "@/components/course/questions/questions-panel";
import { useCourseQuestions } from "@/lib/hooks/useQuestions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCourse,
  useUpdateCourse,
  useDeleteCourse,
} from "@/lib/hooks/useCourses";
import { useSections, useDeleteSection } from "@/lib/hooks/useSections";
import { useDeleteLesson } from "@/lib/hooks/useLessons";
import { useDeleteQuiz, useDuplicateQuiz } from "@/lib/hooks/useQuizzes";
import { useDeleteSession } from "@/lib/hooks/useSessions";
import {
  useCourseEnrollments,
  useRemoveStudent,
} from "@/lib/hooks/useEnrollments";
import {
  CEFR_LEVELS,
  LEVEL_LABELS_EN,
  LEVEL_BADGE_COLORS,
} from "@/lib/constants/levels";
import {
  createCourseSchema,
  type CreateCourseInput,
} from "@/lib/schemas/course.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  ClipboardCheck,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  GraduationCap,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Sparkles,
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
  Lesson,
  QuizWithBlocks,
  SectionWithContent,
} from "@/lib/types";

type LessonDialogState =
  | { mode: "create"; sectionId: string; nextOrder: number }
  | null;

type QuizDialogState =
  | { mode: "create"; sectionId: string; nextOrder: number }
  | null;

type AIQuizDialogState =
  | { sectionId: string; lessons: Pick<Lesson, "id" | "title" | "type">[] }
  | null;

type TabValue = "content" | "sessions" | "students" | "questions" | "settings";

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
  const { mutate: deleteQuiz } = useDeleteQuiz(courseId);
  const { mutate: duplicateQuiz } = useDuplicateQuiz(courseId);
  const { mutate: deleteSession } = useDeleteSession(courseId);
  const { data: enrollments } = useCourseEnrollments(courseId);
  const { mutate: removeStudent } = useRemoveStudent();
  const { data: questions } = useCourseQuestions(courseId);
  const openQuestionsCount =
    questions?.filter((q) => q.status === "open").length ?? 0;

  const [activeTab, setActiveTab] = useState<TabValue>("content");
  const COURSE_TABS: Array<{
    value: TabValue;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    count: number | null;
  }> = [
    { value: "content", label: "Content", Icon: BookOpen, count: sections?.length ?? 0 },
    { value: "sessions", label: "Sessions", Icon: Calendar, count: course?.live_sessions?.length ?? 0 },
    { value: "students", label: "Students", Icon: Users, count: enrollments?.length ?? 0 },
    { value: "questions", label: "Questions", Icon: MessageCircle, count: openQuestionsCount },
    { value: "settings", label: "Settings", Icon: Settings, count: null },
  ];

  const [lessonDialog, setLessonDialog] = useState<LessonDialogState>(null);
  const [quizDialog, setQuizDialog] = useState<QuizDialogState>(null);
  const [aiQuizDialog, setAIQuizDialog] = useState<AIQuizDialogState>(null);
  const [previewQuizId, setPreviewQuizId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: React.ReactNode;
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
      title: "Delete this course",
      description: "This action is irreversible. All sections, lessons, exercises, and associated sessions will be deleted.",
      confirmLabel: "Delete course",
      onConfirm: () =>
        deleteCourse(courseId, {
          onSuccess: () => router.push("/instructor/courses"),
        }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
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
        <p className="text-lg text-muted-foreground">Course not found</p>
        <Link href="/instructor/courses">
          <Button variant="outline">Back to courses</Button>
        </Link>
      </div>
    );
  }

  const lessonTypeLabel = (type: string): string =>
    type === "grammar"
      ? "Grammar"
      : type === "vocabulary"
        ? "Vocabulary"
        : "Resource";

  const totalLessons = sections?.reduce((acc, s) => acc + (s.lessons?.length ?? 0), 0) ?? 0;
  const totalQuizzes = sections?.reduce((acc, s) => acc + (s.quizzes?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-amber-950">
                {course.title}
              </h1>
              <Badge className={LEVEL_BADGE_COLORS[course.level as CEFRLevel]}>
                {course.level} — {LEVEL_LABELS_EN[course.level as CEFRLevel]}
              </Badge>
              <Badge
                variant={course.is_published ? "default" : "secondary"}
                className="capitalize"
              >
                {course.is_published ? "Published" : "Draft"}
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
                Unpublish
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-4 w-4" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        {/* Mobile (<md): single Select picker — 5 icon-only tabs were unreadable */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <SelectTrigger className="h-11 w-full gap-2 rounded-xl border-border bg-card text-sm font-medium text-amber-950 shadow-sm [&>span]:flex [&>span]:items-center [&>span]:gap-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSE_TABS.map(({ value, label, Icon, count }) => (
                <SelectItem key={value} value={value} className="gap-2">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                    {count !== null && (
                      <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop (md+): pill tray */}
        <TabsList className="hidden md:flex w-full justify-start gap-1 rounded-xl border border-border bg-muted/40 p-2">
          <TabsTrigger
            value="content"
            className="gap-1.5 rounded-lg px-4 py-3 lg:px-5 lg:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <BookOpen className="h-4 w-4" />
            <span>Content</span>
            <span className="hidden lg:inline ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {sections?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="gap-1.5 rounded-lg px-4 py-3 lg:px-5 lg:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <Calendar className="h-4 w-4" />
            <span>Sessions</span>
            <span className="hidden lg:inline ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {course.live_sessions?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="gap-1.5 rounded-lg px-4 py-3 lg:px-5 lg:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <Users className="h-4 w-4" />
            <span>Students</span>
            <span className="hidden lg:inline ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {enrollments?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="questions"
            className="gap-1.5 rounded-lg px-4 py-3 lg:px-5 lg:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Questions</span>
            <span className="hidden lg:inline ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              {openQuestionsCount}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-1.5 rounded-lg px-4 py-3 lg:px-5 lg:py-4 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border/60"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* ── CONTENT (Sections → Lessons + Quizzes) ─────────────── */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-950">Course content</p>
              <p className="text-sm text-muted-foreground">
                {sections?.length ?? 0} section{(sections?.length ?? 0) !== 1 ? "s" : ""} · {totalLessons} lesson{totalLessons !== 1 ? "s" : ""} · {totalQuizzes} quiz{totalQuizzes !== 1 ? "zes" : ""}
              </p>
            </div>
            <SectionDialog
              courseId={courseId}
              nextOrder={(sections?.length ?? 0) + 1}
              trigger={
                <Button>
                  <FolderPlus className="mr-1.5 h-4 w-4" />
                  Add section
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

          {/* AI quiz generation dialog */}
          {aiQuizDialog && (
            <QuizAIGenerateDialog
              open
              onOpenChange={(open) => {
                if (!open) setAIQuizDialog(null);
              }}
              courseId={courseId}
              sectionId={aiQuizDialog.sectionId}
              lessons={aiQuizDialog.lessons}
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
                    No sections yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create your first section to organize the content
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
                  onEditLesson={(lesson) =>
                    router.push(
                      `/instructor/courses/${courseId}/lessons/${lesson.id}/edit`,
                    )
                  }
                  onDeleteLesson={(id) =>
                    setConfirmDialog({
                      title: "Delete this lesson",
                      description: "The content and associated documents will be deleted.",
                      onConfirm: () => deleteLesson(id),
                    })
                  }
                  onAddQuiz={() =>
                    setQuizDialog({
                      mode: "create",
                      sectionId: section.id,
                      nextOrder: (section.quizzes?.length ?? 0) + 1,
                    })
                  }
                  onAIQuiz={() =>
                    setAIQuizDialog({
                      sectionId: section.id,
                      lessons: (section.lessons ?? []).map((l) => ({
                        id: l.id,
                        title: l.title,
                        type: l.type,
                      })),
                    })
                  }
                  onPreviewQuiz={(quiz) => setPreviewQuizId(quiz.id)}
                  onViewResults={(quiz) =>
                    router.push(`/instructor/courses/${courseId}/quizzes/${quiz.id}/results`)
                  }
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
                      title: "Delete this quiz",
                      description: "All questions and student attempts will be deleted.",
                      onConfirm: () => deleteQuiz(id),
                    })
                  }
                  onDeleteSection={() =>
                    setConfirmDialog({
                      title: "Delete this section",
                      description: "All lessons, exercises, and quizzes in this section will be deleted.",
                      confirmLabel: "Delete section",
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
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-950">Live sessions</p>
              <p className="text-sm text-muted-foreground">
                {course.live_sessions?.length ?? 0} session
                {(course.live_sessions?.length ?? 0) !== 1 ? "s" : ""} scheduled
              </p>
            </div>
            <SessionDialog
              courseId={courseId}
              trigger={
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Schedule a session
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
                    No sessions scheduled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Schedule your first live session
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
                        {format(sessionDate, "MMM", { locale: enUS })}
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
                            Ended
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
                            Link
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
                          Attendance
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setConfirmDialog({
                            title: "Delete this session",
                            description: "The session will be permanently deleted.",
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
                  This course is a draft
                </p>
                <p className="text-amber-800">
                  Publish the course before enrolling students.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-950">Enrolled students</p>
              <p className="text-sm text-muted-foreground">
                {enrollments?.length ?? 0} student
                {(enrollments?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <AddStudentDialog
              courseId={courseId}
              isPublished={course.is_published}
              trigger={
                <Button>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Add student
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
                    No students enrolled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {course.is_published
                      ? "Add students so they can access the course"
                      : "Publish the course first to enroll students"}
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
                      Enrolled on{" "}
                      {format(new Date(enrollment.enrolled_at), "MMMM d, yyyy", {
                        locale: enUS,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setConfirmDialog({
                        title: "Remove student",
                        description: (
                          <span className="space-y-1">
                            <span className="block">
                              Remove {enrollment.profiles.full_name} from this course?
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              History (quizzes, lessons, attendance) is preserved. You can re-enroll them at any time.
                            </span>
                          </span>
                        ),
                        confirmLabel: "Remove",
                        onConfirm: () =>
                          removeStudent({ courseId, studentId: enrollment.student_id }),
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

        {/* ── QUESTIONS ────────────────────────────────────────────── */}
        <TabsContent value="questions" className="mt-4 w-full !overflow-x-hidden">
          <QuestionsPanel
            courseId={courseId}
            currentUserId={course.instructor_id}
            role="instructor"
          />
        </TabsContent>

        {/* ── SETTINGS ─────────────────────────────────────────────── */}
        <TabsContent value="settings" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-amber-950">
                Edit course
              </CardTitle>
              <CardDescription>
                Update the course&apos;s basic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={editForm.handleSubmit(onEditSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Title</Label>
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
                  <Label>CEFR level</Label>
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
                          {level} — {LEVEL_LABELS_EN[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating
                    ? "Saving..."
                    : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">
                Danger zone
              </CardTitle>
              <CardDescription>
                These actions are irreversible. Proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={onDeleteCourse}>
                <Trash2 className="mr-2 h-4 w-4" />
                Permanently delete this course
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
  onAddQuiz,
  onAIQuiz,
  onEditLesson,
  onPreviewQuiz,
  onViewResults,
  onEditQuiz,
  onDuplicateQuiz,
  onDeleteLesson,
  onDeleteQuiz,
  onDeleteSection,
  lessonTypeLabel,
}: {
  section: SectionWithContent;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onAddLesson: () => void;
  onAddQuiz: () => void;
  onAIQuiz: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onPreviewQuiz: (quiz: QuizWithBlocks) => void;
  onViewResults: (quiz: QuizWithBlocks) => void;
  onEditQuiz: (quiz: QuizWithBlocks) => void;
  onDuplicateQuiz: (quiz: QuizWithBlocks) => void;
  onDeleteLesson: (id: string) => void;
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
            {section.lessons?.length ?? 0} lesson{(section.lessons?.length ?? 0) !== 1 ? "s" : ""} · {section.quizzes?.length ?? 0} quiz{(section.quizzes?.length ?? 0) !== 1 ? "zes" : ""}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onAddLesson}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Lesson</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onAddQuiz}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Quiz</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
            onClick={onAIQuiz}
            disabled={(section.lessons?.length ?? 0) === 0}
            title={
              (section.lessons?.length ?? 0) === 0
                ? "Add at least one lesson to generate with AI"
                : "Generate a quiz with AI"
            }
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI quiz</span>
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

      {/* Expanded content — interleaved timeline (lessons + quizzes sorted by order) */}
      {expanded && (
        <div className="border-t border-border">
          {(() => {
            type TimelineItem =
              | { kind: "lesson"; order: number; lesson: Lesson }
              | { kind: "quiz"; order: number; quiz: QuizWithBlocks };

            // Use the shared section_items timeline so lessons and quizzes
            // appear in the order the instructor arranged them.
            const items: TimelineItem[] = (section.items ?? []).map<TimelineItem>((entry) =>
              entry.item_type === "lesson"
                ? { kind: "lesson", order: entry.position, lesson: entry.data }
                : { kind: "quiz", order: entry.position, quiz: entry.data },
            );

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
                        <div className="flex items-center gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit content"
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
                            {quiz.quiz_blocks?.length ?? 0} block{(quiz.quiz_blocks?.length ?? 0) !== 1 ? "s" : ""}
                          </Badge>
                          {quiz.time_limit_minutes && (
                            <Badge variant="outline" className="text-[10px]">
                              {quiz.time_limit_minutes} min
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => onViewResults(quiz)}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          Results
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-7 w-7" />
                          }>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onPreviewQuiz(quiz)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Student preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditQuiz(quiz)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit quiz
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicateQuiz(quiz)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onDeleteQuiz(quiz.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Empty state inside section */}
          {!section.lessons?.length && !section.quizzes?.length && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                This section is empty. Add lessons, exercises, or quizzes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
