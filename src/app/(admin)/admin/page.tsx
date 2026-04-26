import { requireAdmin } from "@/lib/supabase/guards";
import { AdminOverviewContent } from "@/components/admin/overview-content";

export default async function AdminOverviewPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  return <AdminOverviewContent />;
}
