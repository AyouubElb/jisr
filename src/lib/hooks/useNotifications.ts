"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/lib/constants/queryKeys";
import { notificationsApi } from "@/lib/api/notifications.api";

// Unread count drives the bell badge. Refetch on an interval + on tab focus so
// it stays current without realtime wiring.
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => notificationsApi.list(),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
