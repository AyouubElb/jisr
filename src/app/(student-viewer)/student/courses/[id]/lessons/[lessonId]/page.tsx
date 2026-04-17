"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
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
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: completions } = useMyCompletions(courseId);
  const { data: attempts } = useMyCourseAttempts(courseId);
  const { data: materials, isLoading: materialsLoading } =
    useLessonMaterials(lessonId);
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

  // Build flat navigation: lessons + quizzes interleaved per section, sorted by `order`.
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!course?.sections) return [];
    const out: FlatItem[] = [];
    course.sections.forEach((section, sIdx) => {
      const lessonItems: FlatItem[] = (section.lessons ?? []).map((l) => ({
        kind: "lesson",
        id: l.id,
        title: l.title,
        sectionTitle: section.title,
        sectionIndex: sIdx,
        order: l.order,
        lesson: l,
      }));
      const quizItems: FlatItem[] = (section.quizzes ?? []).map((q) => ({
        kind: "quiz",
        id: q.id,
        title: q.title,
        sectionTitle: section.title,
        sectionIndex: sIdx,
        order: q.order,
        quiz: q,
      }));
      [...lessonItems, ...quizItems]
        .sort((a, b) => a.order - b.order)
        .forEach((item) => out.push(item));
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

  // Auto-expand the section containing the current item so the sidebar
  // lands pre-scrolled to the right place.
  const currentSectionId = current
    ? course?.sections?.[current.sectionIndex]?.id
    : undefined;
  const effectiveExpanded = useMemo(() => {
    const set = new Set(expandedSections);
    if (currentSectionId) set.add(currentSectionId);
    return set;
  }, [expandedSections, currentSectionId]);

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
    markComplete(current.id, {
      onSuccess: () => {
        // Flow naturally to the next item — lesson or quiz — when marking complete.
        if (next) router.push(hrefFor(next));
      },
    });
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
      sidebar={
        <CurriculumSidebar
          sections={course.sections ?? []}
          courseId={courseId}
          activeItemId={current.id}
          completedLessonIds={completedLessonIds}
          submittedQuizIds={submittedQuizIds}
          expandedSections={effectiveExpanded}
          onToggleSection={toggleSection}
        />
      }
      bottomBar={
        <>
          <div>
            {prev ? (
              <Link href={hrefFor(prev)}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">
                    {prev.kind === "quiz" ? "Quiz precedent" : "Lecon precedente"}
                  </span>
                  <span className="sm:hidden">Prec.</span>
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDone ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Termine
              </span>
            ) : (
              <Button
                size="sm"
                disabled={marking}
                onClick={handleComplete}
              >
                <Check className="mr-1 h-4 w-4" />
                Marquer termine
              </Button>
            )}
          </div>
          <div>
            {next ? (
              <Link href={hrefFor(next)}>
                <Button variant="outline" size="sm">
                  <span className="hidden sm:inline">
                    {next.kind === "quiz" ? "Quiz suivant" : "Lecon suivante"}
                  </span>
                  <span className="sm:hidden">Suiv.</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </>
      }
    >
      {/* Header */}
      <div className="space-y-3 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {LESSON_TYPE_LABEL[lesson.type]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Section {current.sectionIndex + 1} &middot; {current.sectionTitle}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          {lesson.title}
        </h1>
      </div>

      {/* Body */}
      {lesson.content ? (
        <RichTextViewer content={lesson.content} />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Cette lecon n&apos;a pas encore de contenu.
          </p>
        </div>
      )}

      {/* Materials */}
      {(materialsLoading || (materials && materials.length > 0)) && (
        <div className="mt-10 space-y-3 border-t border-border pt-6">
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
