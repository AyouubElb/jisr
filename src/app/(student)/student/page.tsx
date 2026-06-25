import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/get-query-client";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/supabase/guards";
import { enrollmentKeys, sessionKeys } from "@/lib/constants/queryKeys";
import { listMyEnrollmentsServer } from "@/lib/api/server/enrollments.server";
import { listUpcomingSessionsServer } from "@/lib/api/server/sessions.server";
import { StudentDashboardClient } from "./student-dashboard-client";

export default async function StudentDashboardPage(): Promise<React.JSX.Element> {
  await requireStudent();
  const supabase = await createServerSupabase();
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: enrollmentKeys.mine(),
      queryFn: () => listMyEnrollmentsServer(supabase),
    }),
    queryClient.prefetchQuery({
      queryKey: sessionKeys.upcoming(),
      queryFn: () => listUpcomingSessionsServer(supabase),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudentDashboardClient />
    </HydrationBoundary>
  );
}
