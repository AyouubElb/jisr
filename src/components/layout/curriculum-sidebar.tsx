"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Circle,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SectionWithContent } from "@/lib/types";

/**
 * Normalized sidebar item — can be a lesson or a quiz. Both types share the
 * same row shape so they can be interleaved inside a section, ordered by the
 * `order` field the instructor set.
 */
interface SidebarItem {
  kind: "lesson" | "quiz";
  id: string;
  title: string;
  href: string;
  order: number;
  done: boolean;
}

interface CurriculumSidebarProps {
  sections: SectionWithContent[];
  courseId: string;
  /** ID of the currently-active item (lesson or quiz) — gets highlighted */
  activeItemId: string;
  /** IDs of lessons the student has completed */
  completedLessonIds: Set<string>;
  /** IDs of quizzes the student has submitted at least once */
  submittedQuizIds: Set<string>;
  /** Manually toggled sections (the one containing active item is always expanded) */
  expandedSections: Set<string>;
  onToggleSection: (id: string) => void;
}

/**
 * Shared viewer curriculum sidebar. Shows all sections with their lessons and
 * quizzes interleaved by `order`, similar to Coursera's course outline. Used
 * by both the lesson viewer and the quiz viewer so the student keeps a
 * consistent sense of place while moving through a course.
 */
export function CurriculumSidebar({
  sections,
  courseId,
  activeItemId,
  completedLessonIds,
  submittedQuizIds,
  expandedSections,
  onToggleSection,
}: CurriculumSidebarProps): React.JSX.Element {
  return (
    <nav className="p-3">
      <div className="px-2 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Programme
        </p>
      </div>
      <div className="space-y-1">
        {sections.map((section, sIdx) => {
          const items = buildItems(section, courseId, completedLessonIds, submittedQuizIds);
          if (items.length === 0) return null;

          const isExpanded = expandedSections.has(section.id);
          const doneCount = items.filter((i) => i.done).length;

          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => onToggleSection(section.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                  {sIdx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-amber-950">
                    {section.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {doneCount}/{items.length} termines
                  </p>
                </div>
              </button>
              {isExpanded && (
                <ul className="mb-2 ml-5 border-l border-border">
                  {items.map((item, idx) => {
                    const isActive = item.id === activeItemId;
                    const Icon =
                      item.kind === "quiz" ? ClipboardList : FileText;
                    return (
                      <li key={`${item.kind}-${item.id}`}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 py-1.5 pl-3 pr-2 text-sm transition-colors",
                            isActive
                              ? "-ml-px border-l-2 border-l-primary bg-primary/5 font-medium text-amber-950"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                          )}
                        >
                          {item.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                          )}
                          <span className="w-5 shrink-0 text-[11px] text-muted-foreground">
                            {idx + 1}.
                          </span>
                          <Icon
                            className={cn(
                              "h-3 w-3 shrink-0",
                              item.kind === "quiz"
                                ? "text-purple-500/70"
                                : "text-primary/60",
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export function CurriculumSidebarSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function buildItems(
  section: SectionWithContent,
  courseId: string,
  completedLessonIds: Set<string>,
  submittedQuizIds: Set<string>,
): SidebarItem[] {
  // Use the shared section_items timeline — single source of truth for the
  // interleaved order of lessons and quizzes within a section.
  return (section.items ?? []).map((entry) => {
    if (entry.item_type === "lesson") {
      return {
        kind: "lesson",
        id: entry.data.id,
        title: entry.data.title,
        href: `/student/courses/${courseId}/lessons/${entry.data.id}`,
        order: entry.position,
        done: completedLessonIds.has(entry.data.id),
      };
    }
    return {
      kind: "quiz",
      id: entry.data.id,
      title: entry.data.title,
      href: `/student/courses/${courseId}/quizzes/${entry.data.id}`,
      order: entry.position,
      done: submittedQuizIds.has(entry.data.id),
    };
  });
}
