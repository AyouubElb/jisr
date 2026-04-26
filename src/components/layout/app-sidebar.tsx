"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { usePendingGradingCount } from "@/lib/hooks/useAttempts";

interface AppSidebarProps {
  role: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "pendingGrading";
}

const studentNav: NavItem[] = [
  { title: "Tableau de bord", href: "/student", icon: LayoutDashboard },
  { title: "Mes cours", href: "/student/courses", icon: BookOpen },
  { title: "Mes notes", href: "/student/attempts", icon: ClipboardList },
  { title: "Sessions en direct", href: "/student/sessions", icon: Calendar },
  { title: "Parametres", href: "/student/settings", icon: Settings },
];

const instructorNav: NavItem[] = [
  { title: "Tableau de bord", href: "/instructor", icon: LayoutDashboard },
  { title: "Mes cours", href: "/instructor/courses", icon: BookOpen },
  { title: "A corriger", href: "/instructor/grading", icon: ClipboardCheck, badgeKey: "pendingGrading" },
  { title: "Sessions en direct", href: "/instructor/sessions", icon: Calendar },
  { title: "Etudiants", href: "/instructor/students", icon: Users },
];

const adminNav: NavItem[] = [
  { title: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { title: "Invitations", href: "/admin/invites", icon: Mail },
  { title: "Instructeurs", href: "/admin/instructors", icon: GraduationCap },
  { title: "Etudiants", href: "/admin/students", icon: Users },
];

export function AppSidebar({ role }: AppSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const navItems = role === "admin" ? adminNav : role === "instructor" ? instructorNav : studentNav;
  const { data: pendingGrading } = usePendingGradingCount();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">English Learn</span>
            <span className="text-xs text-muted-foreground">
              {role === "admin" ? "Administrateur" : role === "instructor" ? "Instructeur" : "Etudiant"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/instructor" || item.href === "/student" || item.href === "/admin"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                const badge =
                  item.badgeKey === "pendingGrading" && pendingGrading && pendingGrading > 0
                    ? pendingGrading
                    : null;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {badge !== null && (
                            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                              {badge}
                            </span>
                          )}
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
