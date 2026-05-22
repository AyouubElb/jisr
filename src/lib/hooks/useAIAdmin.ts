import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aiAdminApi,
  type AIGenerationListFilters,
  type AIGenerationListItem,
  type CalibrationSummary,
  type UpsertEvaluationInput,
} from "@/lib/api/ai-admin.api";
import { aiAdminKeys } from "@/lib/constants/queryKeys";
import type { Database } from "@/lib/types/database";

type AIGenerationRow = Database["public"]["Tables"]["ai_generations"]["Row"];
type AIEvaluationRow =
  Database["public"]["Tables"]["generation_evaluations"]["Row"];

export const useAIGenerations = (filters: AIGenerationListFilters = {}) => {
  return useQuery<AIGenerationListItem[]>({
    queryKey: aiAdminKeys.generations({
      feature: filters.feature,
      model: filters.model,
      onlyUnrated: filters.onlyUnrated,
      onlyErrors: filters.onlyErrors,
    }),
    queryFn: () => aiAdminApi.listGenerations(filters),
  });
};

export const useAIGeneration = (id: string) => {
  return useQuery<AIGenerationRow>({
    queryKey: aiAdminKeys.generation(id),
    queryFn: () => aiAdminApi.getGeneration(id),
    enabled: !!id,
  });
};

export const useAIEvaluations = (generationId: string, rubricKey: string) => {
  return useQuery<{
    human: AIEvaluationRow | null;
    llm: AIEvaluationRow | null;
  }>({
    queryKey: aiAdminKeys.evaluation(generationId),
    queryFn: () => aiAdminApi.getEvaluations(generationId, rubricKey),
    enabled: !!generationId && !!rubricKey,
  });
};

export const useCalibration = (rubricKey: string) => {
  return useQuery<CalibrationSummary>({
    queryKey: aiAdminKeys.agreement(rubricKey),
    queryFn: () => aiAdminApi.getCalibration(rubricKey),
    enabled: !!rubricKey,
  });
};

export const useUpsertEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation<AIEvaluationRow, Error, UpsertEvaluationInput>({
    mutationFn: aiAdminApi.upsertEvaluation,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aiAdminKeys.all });
      queryClient.invalidateQueries({
        queryKey: aiAdminKeys.evaluation(variables.generationId),
      });
      toast.success("Évaluation enregistrée");
    },
    onError: (error) => {
      toast.error(error.message || "Échec de l'enregistrement");
    },
  });
};
