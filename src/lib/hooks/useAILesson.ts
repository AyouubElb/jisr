import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aiApi,
  type GenerateLessonInput,
  type GenerateLessonResponse,
  type ProposeLessonEditInput,
  type ProposeLessonEditResponse,
} from "@/lib/api/ai.api";

export const useProposeAILessonEdit = () => {
  return useMutation<ProposeLessonEditResponse, Error, ProposeLessonEditInput>({
    mutationFn: aiApi.proposeLessonEdit,
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useGenerateAILesson = () => {
  return useMutation<GenerateLessonResponse, Error, GenerateLessonInput>({
    mutationFn: aiApi.generateLesson,
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
