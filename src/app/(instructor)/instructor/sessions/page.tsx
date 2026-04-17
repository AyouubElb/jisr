"use client";

import { Calendar } from "lucide-react";
import { useInstructorSessions } from "@/lib/hooks/useSessions";
import { SessionsPageContent } from "@/components/session/sessions-page-content";

export default function InstructorSessionsPage(): React.JSX.Element {
  const { data: sessions, isLoading } = useInstructorSessions();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Sessions en direct</h1>
        </div>
        <p className="text-muted-foreground">
          Toutes les sessions planifiees pour vos cours
        </p>
      </div>

      <SessionsPageContent
        sessions={sessions}
        isLoading={isLoading}
        showJoinButton={false}
      />
    </div>
  );
}
