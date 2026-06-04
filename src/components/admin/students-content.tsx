"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataListCard, PAGE_SIZE_OPTIONS } from "@/components/admin/data-list-card";
import { useAdminStudents } from "@/lib/hooks/useAdmin";
import { ChevronUp, GraduationCap, Users } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import type { CEFRLevel } from "@/lib/types";
import type { AdminStudent } from "@/lib/api/admin.api";

export function StudentsContent(): React.JSX.Element {
  const { data: students, isLoading } = useAdminStudents();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const filtered = useMemo(
    () =>
      (students ?? []).filter((s) =>
        s.full_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [students, search],
  );

  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const enrolledCount = (students ?? []).filter((s) => s.enrollment_count > 0).length;
  const totalEnrollments = (students ?? []).reduce((sum, s) => sum + s.enrollment_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Etudiants</h1>
        <p className="text-muted-foreground">Tous les etudiants sur la plateforme</p>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="col-span-2 flex flex-col justify-between rounded-xl border bg-primary p-5 text-primary-foreground">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium opacity-80">Etudiants</p>
            <Users className="h-5 w-5 opacity-60" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-10 w-20 bg-primary-foreground/20" />
          ) : (
            <>
              <p className="mt-1 text-4xl font-bold tracking-tight">{students?.length ?? 0}</p>
              <p className="text-sm opacity-70">{enrolledCount} inscrits dans au moins un cours</p>
            </>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">Inscriptions</p>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? <Skeleton className="mt-3 h-8 w-12" /> : (
            <p className="mt-3 text-3xl font-bold">{totalEnrollments}</p>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">Sans cours</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? <Skeleton className="mt-3 h-8 w-12" /> : (
            <p className="mt-3 text-3xl font-bold">{(students?.length ?? 0) - enrolledCount}</p>
          )}
        </div>
      </div>

      {/* ── SEARCH + TABLE ─────────────────────────────────────── */}
      <DataListCard
        search={{
          value: search,
          onChange: (v) => {
            setSearch(v);
            setPage(0);
          },
          placeholder: "Rechercher un etudiant...",
        }}
        isLoading={isLoading}
        loadingRowCount={5}
        isEmpty={filtered.length === 0}
        emptyState={{
          icon: <Users />,
          message: search
            ? "Aucun etudiant trouve"
            : "Aucun etudiant pour le moment",
        }}
        pagination={{
          page,
          pageSize,
          totalCount: filtered.length,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(0);
          },
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
      >
        {pageItems.map((student) => (
          <StudentRow key={student.id} student={student} />
        ))}
      </DataListCard>
    </div>
  );
}

function StudentRow({ student }: { student: AdminStudent }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const initials = student.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground hover:bg-muted/70 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : initials}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium">{student.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {student.enrollment_count > 0
              ? `${student.enrollment_count} cours · via ${student.instructor_names.slice(0, 2).join(", ")}${student.instructor_names.length > 2 ? "..." : ""}`
              : "Aucun cours"}
            {" · "}
            inscrit{" "}
            {formatDistanceToNowStrict(new Date(student.created_at), { locale: fr, addSuffix: true })}
          </p>
        </button>

        {student.level ? (
          <Badge className={`shrink-0 hidden md:inline-flex ${LEVEL_BADGE_COLORS[student.level as CEFRLevel] ?? ""}`}>
            {student.level}
          </Badge>
        ) : (
          <span className="hidden md:inline-block shrink-0 text-xs text-muted-foreground">—</span>
        )}

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{student.enrollment_count}</p>
          <p className="text-xs text-muted-foreground">cours</p>
        </div>
      </div>

      {/* Expanded enrollment list */}
      {expanded && (
        <div className="border-t bg-muted/20 px-4 pb-3 pt-2">
          {student.enrollments.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">Aucun cours</p>
          ) : (
            <div className="space-y-1.5">
              {student.enrollments.map((e) => (
                <div
                  key={e.course_id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm"
                >
                  <Badge
                    className={`shrink-0 px-1.5 py-0 text-[10px] ${LEVEL_BADGE_COLORS[e.course_level as CEFRLevel] ?? ""}`}
                  >
                    {e.course_level}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate">{e.course_title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    via {e.instructor_name}
                  </span>
                  <Badge variant={e.is_published ? "default" : "secondary"} className="shrink-0 text-[10px] px-1.5 py-0">
                    {e.is_published ? "Publie" : "Brouillon"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
