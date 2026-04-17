import { requireStudent } from "@/lib/supabase/guards";
import type { ReactNode } from "react";

/**
 * Focused "reading mode" layout for lesson and quiz viewers.
 *
 * Lives in its own route group so it shares URL space with `(student)` —
 * paths still start with `/student/...` — but escapes the main AppShell
 * sidebar. Children provide their own chrome via `<ViewerShell>`.
 */
export default async function StudentViewerLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  await requireStudent();

  return <div className="min-h-screen bg-background">{children}</div>;
}
