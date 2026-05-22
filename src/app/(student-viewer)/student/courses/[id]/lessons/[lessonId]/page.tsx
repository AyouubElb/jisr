"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { ViewerShell } from "@/components/layout/viewer-shell";
import {
  CurriculumSidebar,
  CurriculumSidebarSkeleton,
} from "@/components/layout/curriculum-sidebar";
import { useCourse } from "@/lib/hooks/useCourses";
import {
  useMyCompletions,
  useMarkLessonComplete,
} from "@/lib/hooks/useCompletions";
import { useMyCourseAttempts } from "@/lib/hooks/useAttempts";
import { useLessonMaterials } from "@/lib/hooks/useMaterials";
import { useLessonAudio } from "@/lib/hooks/useLessonAudio";
import { materialsApi } from "@/lib/api/materials.api";
import { toast } from "sonner";
import type { Lesson, QuizWithBlocks } from "@/lib/types";

/** Flat navigation entry across a course — lessons and quizzes mixed, ordered by section then `order`. */
interface FlatItem {
  kind: "lesson" | "quiz";
  id: string;
  title: string;
  sectionTitle: string;
  sectionIndex: number;
  order: number;
  lesson?: Lesson;
  quiz?: QuizWithBlocks;
}

const LESSON_TYPE_LABEL: Record<Lesson["type"], string> = {
  grammar: "Grammaire",
  vocabulary: "Vocabulaire",
  resource: "Ressource",
};

export default function StudentLessonViewerPage(): React.JSX.Element {
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: completions } = useMyCompletions(courseId);
  const { data: attempts } = useMyCourseAttempts(courseId);
  const { data: materials, isLoading: materialsLoading } =
    useLessonMaterials(lessonId);
  const { data: lessonAudio } = useLessonAudio(lessonId);
  const { mutate: markComplete, isPending: marking } =
    useMarkLessonComplete(courseId);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  const completedLessonIds = useMemo(
    () => new Set(completions?.map((c) => c.lesson_id) ?? []),
    [completions],
  );
  const submittedQuizIds = useMemo(
    () => new Set(attempts?.map((a) => a.quiz_id) ?? []),
    [attempts],
  );

  // Build flat navigation from the section_items timeline (shared ordering
  // across lessons + quizzes).
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!course?.sections) return [];
    const out: FlatItem[] = [];
    course.sections.forEach((section, sIdx) => {
      (section.items ?? []).forEach((entry) => {
        if (entry.item_type === "lesson") {
          out.push({
            kind: "lesson",
            id: entry.data.id,
            title: entry.data.title,
            sectionTitle: section.title,
            sectionIndex: sIdx,
            order: entry.position,
            lesson: entry.data,
          });
        } else {
          out.push({
            kind: "quiz",
            id: entry.data.id,
            title: entry.data.title,
            sectionTitle: section.title,
            sectionIndex: sIdx,
            order: entry.position,
            quiz: entry.data,
          });
        }
      });
    });
    return out;
  }, [course]);

  const currentIdx = flatItems.findIndex(
    (f) => f.kind === "lesson" && f.id === lessonId,
  );
  const current = currentIdx >= 0 ? flatItems[currentIdx] : null;
  const prev = currentIdx > 0 ? flatItems[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < flatItems.length - 1
      ? flatItems[currentIdx + 1]
      : null;

  const isDone = current ? completedLessonIds.has(current.id) : false;

  // Seed the active section as expanded — adjust state during render with a
  // state guard, per react.dev "Adjusting some state when a prop changes".
  const currentSectionId = current
    ? course?.sections?.[current.sectionIndex]?.id
    : undefined;
  const [seededSectionId, setSeededSectionId] = useState<string | null>(null);
  if (currentSectionId && seededSectionId !== currentSectionId) {
    setSeededSectionId(currentSectionId);
    setExpandedSections((prev) => {
      if (prev.has(currentSectionId)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(currentSectionId);
      return nextSet;
    });
  }

  const toggleSection = (id: string): void => {
    setExpandedSections((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  };

  const hrefFor = (item: FlatItem): string =>
    item.kind === "lesson"
      ? `/student/courses/${courseId}/lessons/${item.id}`
      : `/student/courses/${courseId}/quizzes/${item.id}`;

  const handleComplete = (): void => {
    if (!current) return;
    markComplete(current.id);
  };

  const handleDownload = async (path: string, name: string): Promise<void> => {
    try {
      const url = await materialsApi.getSignedUrl(path);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur de telechargement",
      );
    }
  };

  // ── Loading / not found ──────────────────────────────────────
  if (courseLoading) {
    return (
      <ViewerShell
        courseTitle=""
        exitHref={`/student/courses/${courseId}`}
        loading
        sidebar={<CurriculumSidebarSkeleton />}
      >
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </ViewerShell>
    );
  }

  if (!course || !current || !current.lesson) {
    return (
      <ViewerShell
        courseTitle={course?.title ?? "Cours"}
        exitHref={`/student/courses/${courseId}`}
        sidebar={
          <div className="p-6 text-center text-sm text-muted-foreground">
            Lecon introuvable
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">Lecon introuvable</p>
          <Link href={`/student/courses/${courseId}`}>
            <Button variant="outline">Retour au cours</Button>
          </Link>
        </div>
      </ViewerShell>
    );
  }

  const lesson = current.lesson;

  // ── Render ───────────────────────────────────────────────────
  return (
    <ViewerShell
      courseTitle={course.title}
      breadcrumb={current.sectionTitle}
      exitHref={`/student/courses/${courseId}`}
      topRight={
        lesson.content ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">Télécharger PDF</span>
          </Button>
        ) : undefined
      }
      sidebar={
        <CurriculumSidebar
          sections={course.sections ?? []}
          courseId={courseId}
          activeItemId={current.id}
          completedLessonIds={completedLessonIds}
          submittedQuizIds={submittedQuizIds}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
        />
      }
      bottomBar={
        <>
          <div>
            {prev ? (
              <Link href={hrefFor(prev)}>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  <span className="hidden md:inline">
                    {prev.kind === "quiz" ? "Quiz précédent" : "Leçon précédente"}
                  </span>
                  <span className="md:hidden">Préc.</span>
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDone ? (
              <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden md:inline">Terminé</span>
              </span>
            ) : (
              <Button size="sm" disabled={marking} onClick={handleComplete}>
                <Check className="mr-1 h-4 w-4" />
                <span className="hidden md:inline">Marquer terminé</span>
                <span className="md:hidden">Terminé</span>
              </Button>
            )}
            {next ? (
              isDone ? (
                <Link href={hrefFor(next)}>
                  <Button variant="outline" size="sm">
                    <span className="hidden md:inline">
                      {next.kind === "quiz" ? "Quiz suivant" : "Leçon suivante"}
                    </span>
                    <span className="md:hidden">Suiv.</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Marquez la leçon terminée pour continuer"
                >
                  <span className="hidden md:inline">
                    {next.kind === "quiz" ? "Quiz suivant" : "Leçon suivante"}
                  </span>
                  <span className="md:hidden">Suiv.</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )
            ) : null}
          </div>
        </>
      }
    >
      {/* Header */}
      <div className="space-y-2 pb-6">
        <Badge variant="outline" className="text-[10px] print:hidden">
          {LESSON_TYPE_LABEL[lesson.type]}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950 print:text-black print:text-2xl">
          {lesson.title}
        </h1>
      </div>

      {/* Body */}
      {lesson.content ? (
        <RichTextViewer
          content={lesson.content}
          audioEntries={lessonAudio?.entries}
          className="print:text-black"
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Cette lecon n&apos;a pas encore de contenu.
          </p>
        </div>
      )}

      {/* Materials */}
      {(materialsLoading || (materials && materials.length > 0)) && (
        <div className="mt-10 space-y-3 border-t border-border pt-6 print:hidden">
          <h2 className="text-lg font-semibold text-amber-950">
            Documents attaches
          </h2>
          {materialsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {materials!.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleDownload(m.file_url, m.name)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/30"
                >
                  <FileText className="h-5 w-5 shrink-0 text-primary/70" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.file_type || "Document"}
                    </p>
                  </div>
                  <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </ViewerShell>
  );
}
