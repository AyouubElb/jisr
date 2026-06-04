"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataListCard, PAGE_SIZE_OPTIONS } from "@/components/admin/data-list-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useAdminInstructors,
  useAdminInstructorUsage,
  useUpdateInstructorStatus,
  useUpdateInstructorTier,
} from "@/lib/hooks/useAdmin";
import {
  BookOpen,
  ChevronUp,
  Circle,
  DollarSign,
  GraduationCap,
  MoreHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
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

const formatCents = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

export function InstructorsContent(): React.JSX.Element {
  const { data: instructors, isLoading } = useAdminInstructors();
  const { mutate: updateTier, isPending: isUpdatingTier } = useUpdateInstructorTier();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateInstructorStatus();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const filtered = useMemo(
    () =>
      (instructors ?? []).filter((i) =>
        i.full_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [instructors, search],
  );

  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const totalCourses = (instructors ?? []).reduce((s, i) => s + i.course_count, 0);
  const totalStudents = (instructors ?? []).reduce((s, i) => s + i.student_count, 0);
  const activeCount = (instructors ?? []).filter((i) => i.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Instructeurs</h1>
        <p className="text-muted-foreground">Gestion des comptes instructeurs</p>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
      <DataListCard
        search={{
          value: search,
          onChange: (v) => {
            setSearch(v);
            setPage(0);
          },
          placeholder: "Rechercher un instructeur...",
        }}
        isLoading={isLoading}
        isEmpty={filtered.length === 0}
        emptyState={{
          icon: <GraduationCap />,
          message: search
            ? "Aucun instructeur trouve"
            : "Aucun instructeur pour le moment",
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
        {pageItems.map((instructor) => (
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
            isUpdatingTier={isUpdatingTier}
          />
        ))}
      </DataListCard>
    </div>
  );
}

function InstructorRow({
  instructor,
  onTierChange,
  onStatusToggle,
  isPending,
  isUpdatingTier,
}: {
  instructor: AdminInstructor;
  onTierChange: (tier: "free" | "pro" | "studio") => void;
  onStatusToggle: () => void;
  isPending: boolean;
  isUpdatingTier: boolean;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingTier, setPendingTier] = useState<"free" | "pro" | "studio" | null>(
    null,
  );

  const initials = instructor.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const requestTierChange = (tier: "free" | "pro" | "studio"): void => {
    if (tier === instructor.tier) return;
    setMenuOpen(false);
    // Defer dialog open so the dropdown's close animation doesn't swallow the focus.
    setTimeout(() => setPendingTier(tier), 0);
  };

  const confirmTierChange = (): void => {
    if (!pendingTier) return;
    onTierChange(pendingTier);
    setPendingTier(null);
  };

  const isDowngradeToFree = pendingTier === "free";

  return (
    <div>
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : initials}
        </button>

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
          className="shrink-0 hidden md:inline-flex"
        >
          {STATUS_LABELS[instructor.status]}
        </Badge>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
              <DropdownMenuItem
                onClick={() => requestTierChange("free")}
                disabled={instructor.tier === "free"}
              >
                Gratuit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => requestTierChange("pro")}
                disabled={instructor.tier === "pro"}
              >
                Pro
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => requestTierChange("studio")}
                disabled={instructor.tier === "studio"}
              >
                Studio
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onStatusToggle} variant="destructive">
              {instructor.status === "active" ? "Desactiver" : "Activer"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={pendingTier !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTier(null);
        }}
        variant={isDowngradeToFree ? "destructive" : "default"}
        title="Changer le tier ?"
        description={
          <>
            Passer <strong>{instructor.full_name}</strong> de{" "}
            <strong>{TIER_LABELS[instructor.tier]}</strong> à{" "}
            <strong>{pendingTier ? TIER_LABELS[pendingTier] : ""}</strong>.
            {isDowngradeToFree && (
              <span className="mt-2 block text-destructive">
                L&apos;instructeur perdra l&apos;accès à toutes les
                fonctionnalités IA immédiatement.
              </span>
            )}
          </>
        }
        confirmLabel="Confirmer"
        onConfirm={confirmTierChange}
        isPending={isUpdatingTier}
      />

      {expanded && (
        <InstructorDetailPanel instructor={instructor} initials={initials} />
      )}
    </div>
  );
}

function InstructorDetailPanel({
  instructor,
  initials,
}: {
  instructor: AdminInstructor;
  initials: string;
}): React.JSX.Element {
  const { data: usage, isLoading: isUsageLoading } = useAdminInstructorUsage(
    instructor.id,
    true,
  );

  const joinedAt = new Date(instructor.created_at);
  const tone = budgetTone(usage?.percent ?? null);
  const usageLabel = usage
    ? `${formatCents(usage.usedCents)} / ${formatCents(usage.budgetCents)} (${usage.percent}%)`
    : "—";

  return (
    <div className="space-y-4 border-t bg-muted/20 px-5 pb-5 pt-4">
      {/* Header with avatar + name + meta */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{instructor.full_name}</p>
          <p className="text-xs text-muted-foreground">
            Inscrit le {format(joinedAt, "d MMM yyyy", { locale: fr })}
          </p>
        </div>
        <Badge variant={TIER_VARIANTS[instructor.tier]}>
          {TIER_LABELS[instructor.tier]}
        </Badge>
        <Badge variant={instructor.status === "active" ? "default" : "secondary"}>
          {STATUS_LABELS[instructor.status]}
        </Badge>
      </div>

      {/* Usage pill */}
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${tone.color}`}>
        <Circle className={`h-2 w-2 ${tone.dot}`} strokeWidth={0} />
        <span>Utilisation IA · {isUsageLoading ? "…" : usageLabel}</span>
      </div>

      {/* Bento grid 2x2 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Cours"
          value={String(instructor.course_count)}
          icon={<BookOpen className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Etudiants"
          value={String(instructor.student_count)}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="IA ce mois"
          value={isUsageLoading || !usage ? "…" : formatCents(usage.usedCents)}
          pct={usage?.percent ?? null}
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Budget"
          value={isUsageLoading || !usage ? "…" : formatCents(usage.budgetCents)}
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Courses list */}
      <Card className="gap-0! border-0 bg-background py-0! shadow-none">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-sm">Cours</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {instructor.courses.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">Aucun cours cree</p>
          ) : (
            <div className="space-y-1">
              {instructor.courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
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
                  <Badge
                    variant={course.is_published ? "default" : "secondary"}
                    className="shrink-0 px-1.5 py-0 text-[10px]"
                  >
                    {course.is_published ? "Publie" : "Brouillon"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  pct,
  icon,
}: {
  label: string;
  value: string;
  pct?: number | null;
  icon: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {pct !== null && pct !== undefined && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function budgetTone(percent: number | null): { color: string; dot: string } {
  if (percent === null) {
    return { color: "border-muted-foreground/30 text-muted-foreground", dot: "fill-muted-foreground" };
  }
  if (percent >= 90) return { color: "border-destructive/40 text-destructive", dot: "fill-destructive" };
  if (percent >= 70) return { color: "border-amber-500/40 text-amber-700", dot: "fill-amber-500" };
  return { color: "border-emerald-500/40 text-emerald-700", dot: "fill-emerald-500" };
}
