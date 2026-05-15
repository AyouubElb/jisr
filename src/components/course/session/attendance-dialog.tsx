"use client";

import { useState } from "react";
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
import { AlertTriangle, Check, X, Users } from "lucide-react";
import {
  useSessionAttendance,
  useSaveAttendance,
} from "@/lib/hooks/useAttendance";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* key={sessionId} resets the inner state when the instructor switches sessions */}
      <AttendanceDialogBody
        key={sessionId}
        sessionId={sessionId}
        courseId={courseId}
        sessionTitle={sessionTitle}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

interface AttendanceDialogBodyProps {
  sessionId: string;
  courseId: string;
  sessionTitle: string;
  onClose: () => void;
}

function AttendanceDialogBody({
  sessionId,
  courseId,
  sessionTitle,
  onClose,
}: AttendanceDialogBodyProps): React.JSX.Element {
  const { data: rows, isLoading } = useSessionAttendance(sessionId, courseId);
  const { mutate: save, isPending: isSaving } = useSaveAttendance(sessionId);

  // overrides[studentId] = true|false means the user toggled it; missing keys
  // fall back to the row's stored attended value.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isAttended = (studentId: string, fallback: boolean): boolean =>
    overrides[studentId] ?? fallback;

  const toggle = (studentId: string, current: boolean): void => {
    setOverrides((prev) => ({ ...prev, [studentId]: !current }));
  };

  const setAll = (value: boolean): void => {
    if (!rows) return;
    setOverrides(Object.fromEntries(rows.map((r) => [r.studentId, value])));
  };

  const handleSave = (): void => {
    if (!rows) return;
    save(
      rows.map((r) => ({
        studentId: r.studentId,
        attended: isAttended(r.studentId, r.attended),
      })),
      { onSuccess: onClose },
    );
  };

  const presentCount = rows
    ? rows.filter((r) => isAttended(r.studentId, r.attended)).length
    : 0;
  const totalCount = rows?.length ?? 0;

  return (
    <>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Attendance — {sessionTitle}</DialogTitle>
          <DialogDescription>
            Everyone is marked present by default. Uncheck anyone who
            didn&apos;t attend.
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
            <p className="text-sm text-muted-foreground">
              No students enrolled
            </p>
          </div>
        ) : (
          <>
            {/* Bulk toggles */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <p className="text-sm text-muted-foreground">
                {presentCount} / {totalCount} present
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAll(true)}>
                  All present
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
                  None
                </Button>
              </div>
            </div>

            {/* Student rows */}
            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {rows.map((row) => {
                const isPresent = isAttended(row.studentId, row.attended);
                return (
                  <button
                    type="button"
                    key={row.studentId}
                    onClick={() => toggle(row.studentId, isPresent)}
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
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {row.fullName}
                        </span>
                        {row.recentAbsentStreak && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Missed last 2 sessions
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isPresent
                          ? "bg-emerald-600 text-white"
                          : "border border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {isPresent ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !rows?.length}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </>
  );
}
