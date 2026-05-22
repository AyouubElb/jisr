import { requireAdmin } from "@/lib/supabase/guards";
import { CalibrationContent } from "@/components/admin/calibration-content";

export default async function CalibrationPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  return <CalibrationContent />;
}
