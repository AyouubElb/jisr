import { requireAdmin } from "@/lib/supabase/guards";
import { InstructorsContent } from "@/components/admin/instructors-content";

export default async function AdminInstructorsPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  return <InstructorsContent />;
}
