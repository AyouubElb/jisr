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
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { usePendingGradingCount } from "@/lib/hooks/useAttempts";
import { useUnmarkedAttendanceCount } from "@/lib/hooks/useAttendance";

interface AppSidebarProps {
  role: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "pendingGrading" | "unmarkedAttendance";
}

const studentNav: NavItem[] = [
  { title: "Tableau de bord", href: "/student", icon: LayoutDashboard },
  { title: "Mes cours", href: "/student/courses", icon: BookOpen },
  { title: "Mes notes", href: "/student/attempts", icon: ClipboardList },
  { title: "Sessions en direct", href: "/student/sessions", icon: Calendar },
  { title: "Parametres", href: "/student/settings", icon: Settings },
];

const instructorNav: NavItem[] = [
  { title: "Dashboard", href: "/instructor", icon: LayoutDashboard },
  { title: "My courses", href: "/instructor/courses", icon: BookOpen },
  { title: "To grade", href: "/instructor/grading", icon: ClipboardCheck, badgeKey: "pendingGrading" },
  { title: "Live sessions", href: "/instructor/sessions", icon: Calendar, badgeKey: "unmarkedAttendance" },
  { title: "Students", href: "/instructor/students", icon: Users },
  { title: "Settings", href: "/instructor/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard },
  { title: "Invites", href: "/admin/invites", icon: Mail },
  { title: "Instructors", href: "/admin/instructors", icon: GraduationCap },
  { title: "Students", href: "/admin/students", icon: Users },
  { title: "AI generations", href: "/admin/ai/generations", icon: Sparkles },
];

export function AppSidebar({ role }: AppSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const navItems = role === "admin" ? adminNav : role === "instructor" ? instructorNav : studentNav;
  const { data: pendingGrading } = usePendingGradingCount();
  const { data: unmarkedAttendance } = useUnmarkedAttendanceCount();
  const homeHref =
    role === "instructor" ? "/instructor" : role === "student" ? "/student" : "/admin";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href={homeHref}
          aria-label="Jisr"
          className="flex items-center gap-3 px-2 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <span className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold tracking-tight text-amber-950 leading-none">
              Jisr
            </span>
            <span
              aria-hidden
              className="text-lg font-semibold text-primary"
              style={{ lineHeight: 1 }}
            >
              ج
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {role === "admin" ? "Administrator" : role === "instructor" ? "Instructor" : "Etudiant"}
          </span>
        </Link>
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
                    ? { count: pendingGrading, tone: "amber" as const }
                    : item.badgeKey === "unmarkedAttendance" && unmarkedAttendance && unmarkedAttendance > 0
                      ? { count: unmarkedAttendance, tone: "rose" as const }
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
                            <span
                              className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white ${
                                badge.tone === "rose" ? "bg-rose-500" : "bg-amber-500"
                              }`}
                            >
                              {badge.count}
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
