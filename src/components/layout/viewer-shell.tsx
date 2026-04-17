"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ViewerShellProps {
  /** Text shown on the left of the top bar — usually the course title */
  courseTitle: string;
  /** Optional breadcrumb under the title (e.g. section name) */
  breadcrumb?: string;
  /** Where the close button navigates — usually back to the course detail page */
  exitHref: string;
  /** Left sidebar content — curriculum list for lessons, question list for quizzes, etc. */
  sidebar: ReactNode;
  /** Bottom navigation bar — prev/next buttons, complete action, etc. */
  bottomBar?: ReactNode;
  /** Optional slot in the top bar, right before the close button (e.g. quiz timer) */
  topRight?: ReactNode;
  /** Main content (lesson body, quiz questions, ...) */
  children: ReactNode;
  /** Whether the top bar + sidebar should render in a loading skeleton state */
  loading?: boolean;
}

/**
 * Focused viewer chrome shared by lesson + quiz pages.
 * No main app sidebar — this is a deliberate departure from the dashboard
 * chrome so students can read without distractions.
 */
export function ViewerShell({
  courseTitle,
  breadcrumb,
  exitHref,
  sidebar,
  bottomBar,
  topRight,
  children,
  loading = false,
}: ViewerShellProps): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
        <div className="min-w-0 flex-1">
          {loading ? (
            <Skeleton className="h-5 w-64" />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-amber-950">
                {courseTitle}
              </p>
              {breadcrumb && (
                <>
                  <span className="text-muted-foreground">&middot;</span>
                  <p className="truncate text-sm text-muted-foreground">
                    {breadcrumb}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        {topRight && <div className="shrink-0">{topRight}</div>}
        <Link href={exitHref} aria-label="Fermer">
          <Button variant="ghost" size="icon" className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* ── Body: sidebar + content ────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden w-72 shrink-0 overflow-y-auto border-r border-border bg-card lg:block",
          )}
        >
          {sidebar}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="max-w-4xl p-6 lg:px-10 lg:py-10">{children}</div>
        </main>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────── */}
      {bottomBar && (
        <footer className="flex h-16 shrink-0 items-center justify-between gap-4 border-t border-border bg-card px-4 lg:px-6">
          {bottomBar}
        </footer>
      )}
    </div>
  );
}
