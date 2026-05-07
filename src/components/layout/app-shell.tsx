import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import type { UserRole } from "@/lib/types";
import type { ReactNode } from "react";

interface AppShellProps {
  role: UserRole;
  fullName: string;
  children: ReactNode;
}

export function AppShell({ role, fullName, children }: AppShellProps): React.JSX.Element {
  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset>
        <AppHeader fullName={fullName} role={role} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-6 pb-20 md:pb-6">{children}</main>
      </SidebarInset>
      <BottomNav role={role} />
    </SidebarProvider>
  );
}
