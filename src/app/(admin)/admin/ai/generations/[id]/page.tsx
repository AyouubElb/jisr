import { requireAdmin } from "@/lib/supabase/guards";
import { AIGenerationDetailContent } from "@/components/admin/ai-generation-detail-content";

export default async function AIGenerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  await requireAdmin();
  const { id } = await params;
  return <AIGenerationDetailContent id={id} />;
}
