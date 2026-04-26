"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAdminInstructors,
  useUpdateInstructorStatus,
  useUpdateInstructorTier,
} from "@/lib/hooks/useAdmin";
import { BookOpen, ChevronUp, GraduationCap, MoreHorizontal, Search, Users } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import type { CEFRLevel } from "@/lib/types";
import type { AdminInstructor } from "@/lib/api/admin.api";

const TIER_LABELS: Record<string, string> = {
  free: "Gratuit",
  pro: "Pro",
  studio: "Studio",
};

const TIER_VARIANTS: Record<string, "secondary" | "default" | "outline"> = {
  free: "secondary",
  pro: "default",
  studio: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
};

export function InstructorsContent(): React.JSX.Element {
  const { data: instructors, isLoading } = useAdminInstructors();
  const { mutate: updateTier, isPending: isUpdatingTier } = useUpdateInstructorTier();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateInstructorStatus();
  const [search, setSearch] = useState("");

  const filtered = (instructors ?? []).filter((i) =>
    i.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCourses = (instructors ?? []).reduce((s, i) => s + i.course_count, 0);
  const totalStudents = (instructors ?? []).reduce((s, i) => s + i.student_count, 0);
  const activeCount = (instructors ?? []).filter((i) => i.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instructeurs</h1>
        <p className="text-muted-foreground">Gestion des comptes instructeurs</p>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col justify-between rounded-xl border bg-primary p-5 text-primary-foreground">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium opacity-80">Instructeurs</p>
            <GraduationCap className="h-5 w-5 opacity-60" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-10 w-20 bg-primary-foreground/20" />
          ) : (
            <>
              <p className="mt-1 text-4xl font-bold tracking-tight">{instructors?.length ?? 0}</p>
              <p className="text-sm opacity-70">{activeCount} actif{activeCount !== 1 ? "s" : ""}</p>
            </>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">Cours publies</p>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? <Skeleton className="mt-3 h-8 w-12" /> : (
            <p className="mt-3 text-3xl font-bold">{totalCourses}</p>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">Etudiants total</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? <Skeleton className="mt-3 h-8 w-12" /> : (
            <p className="mt-3 text-3xl font-bold">{totalStudents}</p>
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
                placeholder="Rechercher un instructeur..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-0 divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search ? "Aucun instructeur trouve" : "Aucun instructeur pour le moment"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((instructor) => (
                <InstructorRow
                  key={instructor.id}
                  instructor={instructor}
                  onTierChange={(tier) => updateTier({ id: instructor.id, tier })}
                  onStatusToggle={() =>
                    updateStatus({
                      id: instructor.id,
                      status: instructor.status === "active" ? "pending" : "active",
                    })
                  }
                  isPending={isUpdatingTier || isUpdatingStatus}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InstructorRow({
  instructor,
  onTierChange,
  onStatusToggle,
  isPending,
}: {
  instructor: AdminInstructor;
  onTierChange: (tier: "free" | "pro" | "studio") => void;
  onStatusToggle: () => void;
  isPending: boolean;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const initials = instructor.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : initials}
        </button>

        {/* Name + meta — clicking also expands */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium">{instructor.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {instructor.course_count} cours · {instructor.student_count} etudiant{instructor.student_count !== 1 ? "s" : ""} ·{" "}
            inscrit{" "}
            {formatDistanceToNowStrict(new Date(instructor.created_at), { locale: fr, addSuffix: true })}
          </p>
        </button>

        <Badge variant={TIER_VARIANTS[instructor.tier]} className="shrink-0">
          {TIER_LABELS[instructor.tier]}
        </Badge>
        <Badge
          variant={instructor.status === "active" ? "default" : "secondary"}
          className="shrink-0 hidden sm:inline-flex"
        >
          {STATUS_LABELS[instructor.status]}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button
              type="button"
              disabled={isPending}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-muted disabled:opacity-50"
            />
          }>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Tier</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onTierChange("free")}>Gratuit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTierChange("pro")}>Pro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTierChange("studio")}>Studio</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onStatusToggle} variant="destructive">
              {instructor.status === "active" ? "Desactiver" : "Activer"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded course list */}
      {expanded && (
        <div className="border-t bg-muted/20 px-4 pb-3 pt-2">
          {instructor.courses.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">Aucun cours cree</p>
          ) : (
            <div className="space-y-1.5">
              {instructor.courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm"
                >
                  <Badge
                    className={`shrink-0 px-1.5 py-0 text-[10px] ${LEVEL_BADGE_COLORS[course.level as CEFRLevel] ?? ""}`}
                  >
                    {course.level}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate">{course.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {course.student_count} etudiant{course.student_count !== 1 ? "s" : ""}
                  </span>
                  <Badge variant={course.is_published ? "default" : "secondary"} className="shrink-0 text-[10px] px-1.5 py-0">
                    {course.is_published ? "Publie" : "Brouillon"}
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
