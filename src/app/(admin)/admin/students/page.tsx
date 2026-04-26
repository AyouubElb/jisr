import { requireAdmin } from "@/lib/supabase/guards";
import { StudentsContent } from "@/components/admin/students-content";

export default async function AdminStudentsPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  return <StudentsContent />;
}
