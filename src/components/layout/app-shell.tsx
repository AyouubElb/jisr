import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
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
        <AppHeader fullName={fullName} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
