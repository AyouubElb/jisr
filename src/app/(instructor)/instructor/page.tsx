import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/get-query-client";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireInstructor } from "@/lib/supabase/guards";
import {
  courseKeys,
  sessionKeys,
  enrollmentKeys,
  engagementKeys,
  attendanceKeys,
  attemptKeys,
  profileKeys,
} from "@/lib/constants/queryKeys";
import { listMyCoursesServer } from "@/lib/api/server/courses.server";
import { listUpcomingSessionsServer } from "@/lib/api/server/sessions.server";
import { listForInstructorServer } from "@/lib/api/server/enrollments.server";
import { recentActivityServer } from "@/lib/api/server/engagement.server";
import { unmarkedForInstructorServer } from "@/lib/api/server/attendance.server";
import { pendingGradingCountServer } from "@/lib/api/server/attempts.server";
import { InstructorDashboardClient } from "./dashboard-client";

export default async function InstructorDashboardPage(): Promise<React.JSX.Element> {
  const profile = await requireInstructor();
  const supabase = await createServerSupabase();
  const queryClient = getQueryClient();
  const uid = profile.id;

  // prefetchQuery swallows its own errors: a failed prefetch just leaves that
  // entry empty and the client hook refetches it — never blanks the page.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: courseKeys.list({ level: "__mine__" }),
      queryFn: () => listMyCoursesServer(supabase, uid),
    }),
    queryClient.prefetchQuery({
      queryKey: sessionKeys.upcoming(),
      queryFn: () => listUpcomingSessionsServer(supabase),
    }),
    queryClient.prefetchQuery({
      queryKey: [...enrollmentKeys.all, "instructor-overview"],
      queryFn: () => listForInstructorServer(supabase, uid),
    }),
    queryClient.prefetchQuery({
      queryKey: engagementKeys.recentActivity(),
      queryFn: () => recentActivityServer(supabase, uid),
    }),
    queryClient.prefetchQuery({
      queryKey: attendanceKeys.unmarked(),
      queryFn: () => unmarkedForInstructorServer(supabase, uid),
    }),
    queryClient.prefetchQuery({
      queryKey: attemptKeys.pendingCount(),
      queryFn: () => pendingGradingCountServer(supabase, uid),
    }),
  ]);

  // Profile is already resolved by the guard — seed it directly.
  queryClient.setQueryData(profileKeys.me(), profile);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InstructorDashboardClient />
    </HydrationBoundary>
  );
}
