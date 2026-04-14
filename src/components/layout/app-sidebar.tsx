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
import { BookOpen, Calendar, GraduationCap, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

interface AppSidebarProps {
  role: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const studentNav: NavItem[] = [
  { title: "Tableau de bord", href: "/student", icon: LayoutDashboard },
  { title: "Mes cours", href: "/student/courses", icon: BookOpen },
  { title: "Sessions en direct", href: "/student/sessions", icon: Calendar },
];

const instructorNav: NavItem[] = [
  { title: "Tableau de bord", href: "/instructor", icon: LayoutDashboard },
  { title: "Mes cours", href: "/instructor/courses", icon: BookOpen },
  { title: "Sessions en direct", href: "/instructor/sessions", icon: Calendar },
  { title: "Etudiants", href: "/instructor/students", icon: Users },
];

export function AppSidebar({ role }: AppSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const navItems = role === "instructor" ? instructorNav : studentNav;

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
              {role === "instructor" ? "Instructeur" : "Etudiant"}
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
                  item.href === "/instructor" || item.href === "/student"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
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
