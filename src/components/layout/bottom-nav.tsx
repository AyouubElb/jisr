"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { usePendingGradingCount } from "@/lib/hooks/useAttempts";
import type { UserRole } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "pendingGrading";
}

const studentItems: NavItem[] = [
  { label: "Accueil", href: "/student", icon: LayoutDashboard },
  { label: "Cours", href: "/student/courses", icon: BookOpen },
  { label: "Notes", href: "/student/attempts", icon: ClipboardList },
  { label: "Sessions", href: "/student/sessions", icon: Calendar },
  { label: "Compte", href: "/student/settings", icon: Settings },
];

const instructorItems: NavItem[] = [
  { label: "Home", href: "/instructor", icon: LayoutDashboard },
  { label: "Courses", href: "/instructor/courses", icon: BookOpen },
  { label: "Grade", href: "/instructor/grading", icon: ClipboardCheck, badgeKey: "pendingGrading" },
  { label: "Sessions", href: "/instructor/sessions", icon: Calendar },
  { label: "Students", href: "/instructor/students", icon: Users },
];

const adminItems: NavItem[] = [
  { label: "Home", href: "/admin", icon: LayoutDashboard },
  { label: "Invites", href: "/admin/invites", icon: Mail },
  { label: "Instructors", href: "/admin/instructors", icon: GraduationCap },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "AI", href: "/admin/ai/generations", icon: Sparkles },
];

export function BottomNav({ role }: { role: UserRole }): React.JSX.Element {
  const pathname = usePathname();
  const { data: pendingGrading } = usePendingGradingCount();

  const items =
    role === "admin" ? adminItems : role === "instructor" ? instructorItems : studentItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
      {items.map((item) => {
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
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {badge !== null && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </div>
            <span className={cn("text-[10px]", isActive && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
