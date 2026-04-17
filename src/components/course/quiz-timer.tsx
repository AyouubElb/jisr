"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  /** ISO timestamp when the attempt was started (from student_attempts.started_at) */
  startedAt: string;
  /** Quiz time limit in minutes; if null/0 the timer is disabled */
  timeLimitMinutes: number | null;
  /** Called once when the deadline passes. Parent should trigger auto-submit. */
  onExpire: () => void;
}

/**
 * Displays remaining time for an in-progress quiz attempt and fires
 * onExpire exactly once when the deadline is reached.
 *
 * Deadline is computed from started_at + time_limit_minutes so reloading
 * the page does NOT reset the countdown — the server-truth timestamp is
 * the source of truth.
 */
export function QuizTimer({
  startedAt,
  timeLimitMinutes,
  onExpire,
}: QuizTimerProps): React.JSX.Element | null {
  const deadline =
    timeLimitMinutes && timeLimitMinutes > 0
      ? new Date(startedAt).getTime() + timeLimitMinutes * 60 * 1000
      : null;

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    deadline ? Math.max(0, deadline - Date.now()) : 0,
  );
  const firedRef = useRef(false);

  useEffect(() => {
    if (!deadline) return;

    const tick = (): void => {
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  if (!deadline) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isCritical = remainingMs <= 60_000; // under 1 minute
  const isWarning = remainingMs <= 5 * 60_000 && !isCritical; // under 5 minutes

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium tabular-nums",
        isCritical
          ? "border-red-300 bg-red-50 text-red-700"
          : isWarning
            ? "border-amber-300 bg-amber-50 text-amber-800"
            : "border-border bg-muted text-foreground",
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock className="h-4 w-4" />
      <span>{mmss}</span>
    </div>
  );
}
