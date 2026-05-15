"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { useInstructorSessions } from "@/lib/hooks/useSessions";
import { useUnmarkedSessions } from "@/lib/hooks/useAttendance";
import { SessionsPageContent } from "@/components/session/sessions-page-content";

export default function InstructorSessionsPage(): React.JSX.Element {
  const { data: sessions, isLoading } = useInstructorSessions();
  const { data: unmarked } = useUnmarkedSessions();

  const unmarkedSessionIds = useMemo(
    () => new Set((unmarked ?? []).map((s) => s.id)),
    [unmarked],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl md:text-3xl font-bold">Live sessions</h1>
        </div>
        <p className="text-muted-foreground">
          All sessions scheduled for your courses
        </p>
      </div>

      <SessionsPageContent
        sessions={sessions}
        isLoading={isLoading}
        showJoinButton={false}
        unmarkedSessionIds={unmarkedSessionIds}
      />
    </div>
  );
}
