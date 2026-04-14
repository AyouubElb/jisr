"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Users } from "lucide-react";
import { useSessionAttendance, useSaveAttendance } from "@/lib/hooks/useAttendance";

interface AttendanceDialogProps {
  sessionId: string;
  courseId: string;
  sessionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceDialog({
  sessionId,
  courseId,
  sessionTitle,
  open,
  onOpenChange,
}: AttendanceDialogProps): React.JSX.Element {
  const { data: rows, isLoading } = useSessionAttendance(
    open ? sessionId : "",
    open ? courseId : "",
  );
  const { mutate: save, isPending: isSaving } = useSaveAttendance(sessionId);

  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (rows) {
      setAttendance(
        Object.fromEntries(rows.map((r) => [r.studentId, r.attended])),
      );
    }
  }, [rows]);

  const toggle = (studentId: string): void => {
    setAttendance((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const setAll = (value: boolean): void => {
    if (!rows) return;
    setAttendance(Object.fromEntries(rows.map((r) => [r.studentId, value])));
  };

  const handleSave = (): void => {
    if (!rows) return;
    save(
      rows.map((r) => ({ studentId: r.studentId, attended: attendance[r.studentId] ?? false })),
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = rows?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Presence — {sessionTitle}</DialogTitle>
          <DialogDescription>
            Cochez les etudiants qui ont assiste a la session
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !rows?.length ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun etudiant inscrit</p>
          </div>
        ) : (
          <>
            {/* Bulk toggles */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <p className="text-sm text-muted-foreground">
                {presentCount} / {totalCount} presents
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAll(true)}>
                  Tous presents
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
                  Aucun
                </Button>
              </div>
            </div>

            {/* Student rows */}
            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {rows.map((row) => {
                const isPresent = attendance[row.studentId] ?? false;
                return (
                  <button
                    type="button"
                    key={row.studentId}
                    onClick={() => toggle(row.studentId)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isPresent
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {row.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-medium">{row.fullName}</span>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isPresent
                          ? "bg-emerald-600 text-white"
                          : "border border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {isPresent ? <Check className="h-4 w-4" /> : <X className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !rows?.length}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
