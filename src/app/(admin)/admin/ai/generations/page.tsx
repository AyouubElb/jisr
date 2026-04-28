import { requireAdmin } from "@/lib/supabase/guards";
import { AIGenerationsListContent } from "@/components/admin/ai-generations-list-content";

export default async function AIGenerationsListPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  return <AIGenerationsListContent />;
}
