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
import { useUnmarkedAttendanceCount } from "@/lib/hooks/useAttendance";
import type { UserRole } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "pendingGrading" | "unmarkedAttendance";
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
  { label: "Sessions", href: "/instructor/sessions", icon: Calendar, badgeKey: "unmarkedAttendance" },
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
  const { data: unmarkedAttendance } = useUnmarkedAttendanceCount();

  const items =
    role === "admin" ? adminItems : role === "instructor" ? instructorItems : studentItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden border-t border-border bg-background/95 backdrop-blur-sm">
      {items.map((item) => {
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
                <span
                  className={`absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${
                    badge.tone === "rose" ? "bg-rose-500" : "bg-amber-500"
                  }`}
                >
                  {badge.count}
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
