import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/constants/queryKeys";
import { adminApi } from "@/lib/api/admin.api";
import { toast } from "sonner";

export const useAdminStats = () => {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: adminApi.stats,
  });
};

export const useAdminRecentInvites = () => {
  return useQuery({
    queryKey: adminKeys.recentInvites(),
    queryFn: adminApi.recentInvites,
  });
};

export const useAdminInstructors = () => {
  return useQuery({
    queryKey: adminKeys.instructors(),
    queryFn: adminApi.instructors,
  });
};

export const useAdminStudents = () => {
  return useQuery({
    queryKey: adminKeys.students(),
    queryFn: adminApi.students,
  });
};

export const useUpdateInstructorTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: "free" | "pro" | "studio" }) =>
      adminApi.updateInstructorTier(id, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.instructors() });
      toast.success("Tier mis a jour");
    },
    onError: () => toast.error("Erreur lors de la mise a jour"),
  });
};

export const useUpdateInstructorStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "active" }) =>
      adminApi.updateInstructorStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.instructors() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      toast.success("Statut mis a jour");
    },
    onError: () => toast.error("Erreur lors de la mise a jour"),
  });
};
