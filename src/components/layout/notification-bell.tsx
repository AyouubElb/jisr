"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/useNotifications";
import type { Notification } from "@/lib/api/notifications.api";
import type { UserRole } from "@/lib/types";

interface NotificationBellProps {
  role: UserRole;
}

export function NotificationBell({ role }: NotificationBellProps): React.JSX.Element {
  const isStudent = role === "student";
  const t = isStudent
    ? {
        title: "Notifications",
        empty: "Aucune notification",
        markAll: "Tout marquer comme lu",
      }
    : {
        title: "Notifications",
        empty: "No notifications",
        markAll: "Mark all as read",
      };

  const { data: unread = 0 } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t.title}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">{t.title}</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="text-xs text-primary hover:underline"
            >
              {t.markAll}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {t.empty}
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                isStudent={isStudent}
                onRead={() => markRead.mutate(n.id)}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({
  notification,
  isStudent,
  onRead,
}: {
  notification: Notification;
  isStudent: boolean;
  onRead: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const rendered = renderNotification(notification, isStudent);
  const when = formatDistanceToNowStrict(new Date(notification.created_at), {
    locale: isStudent ? fr : enUS,
    addSuffix: true,
  });

  const onClick = (): void => {
    if (notification.read_at === null) onRead();
    if (rendered.href) router.push(rendered.href);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start gap-2">
        {notification.read_at === null && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
        <div className={notification.read_at === null ? "" : "pl-4"}>
          <p className="text-sm font-medium leading-snug">{rendered.title}</p>
          <p className="text-xs text-muted-foreground">{rendered.body}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">{when}</p>
        </div>
      </div>
    </button>
  );
}

// Per-type rendering. Student-facing text is French, instructor-facing English.
function renderNotification(
  n: Notification,
  isStudent: boolean,
): { title: string; body: string; href: string | null } {
  switch (n.type) {
    case "quiz_corrected": {
      const p = n.payload as {
        quiz_title?: string;
        attempt_id?: string;
        score?: number | null;
      };
      const href = p.attempt_id ? `/student/attempts/${p.attempt_id}` : null;
      return isStudent
        ? {
            title: "Quiz corrigé",
            body:
              p.score != null
                ? `${p.quiz_title ?? "Votre quiz"} — note : ${p.score}%`
                : `${p.quiz_title ?? "Votre quiz"} a été corrigé`,
            href,
          }
        : {
            title: "Quiz graded",
            body: `${p.quiz_title ?? "Quiz"} graded`,
            href,
          };
    }
    default:
      return { title: "Notification", body: "", href: null };
  }
}
