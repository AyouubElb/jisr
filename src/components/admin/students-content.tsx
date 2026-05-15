"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStudents } from "@/lib/hooks/useAdmin";
import { ChevronUp, GraduationCap, Search, Users } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import type { CEFRLevel } from "@/lib/types";
import type { AdminStudent } from "@/lib/api/admin.api";

export function StudentsContent(): React.JSX.Element {
  const { data: students, isLoading } = useAdminStudents();
  const [search, setSearch] = useState("");

  const filtered = (students ?? []).filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()),
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
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un etudiant..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search ? "Aucun etudiant trouve" : "Aucun etudiant pour le moment"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((student) => (
                <StudentRow key={student.id} student={student} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
