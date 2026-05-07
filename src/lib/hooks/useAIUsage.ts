import { useQuery } from "@tanstack/react-query";
import { aiApi, type MonthlyUsageSummary } from "@/lib/api/ai.api";
import { aiUsageKeys } from "@/lib/constants/queryKeys";

export const useMyAIUsage = () => {
  return useQuery<MonthlyUsageSummary>({
    queryKey: aiUsageKeys.mine(),
    queryFn: () => aiApi.getMyUsage(),
    // Usage shifts after each generation; 60s is fresh enough for a settings page.
    staleTime: 60_000,
  });
};
