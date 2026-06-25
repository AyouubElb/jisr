import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/get-query-client";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/guards";
import { adminKeys } from "@/lib/constants/queryKeys";
import { statsServer, recentInvitesServer } from "@/lib/api/server/admin.server";
import { AdminOverviewContent } from "@/components/admin/overview-content";

export default async function AdminOverviewPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: adminKeys.stats(),
      queryFn: () => statsServer(supabase),
    }),
    queryClient.prefetchQuery({
      queryKey: adminKeys.recentInvites(),
      queryFn: () => recentInvitesServer(supabase),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminOverviewContent />
    </HydrationBoundary>
  );
}
