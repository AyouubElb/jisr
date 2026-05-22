"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi, type LessonAudioResponse } from "@/lib/api/ai.api";
import { lessonKeys } from "@/lib/constants/queryKeys";

/** Trigger audio generation for a lesson. Idempotent — cache-keyed by hash. */
export function useSynthesizeLessonAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiApi.synthesizeLessonAudio,
    onSuccess: (res, { lessonId }) => {
      queryClient.setQueryData<LessonAudioResponse>(
        lessonKeys.audio(lessonId),
        res,
      );
    },
  });
}

/** Read-only fetch of cached audio map for a lesson. Never generates. */
export function useLessonAudio(lessonId: string | undefined) {
  return useQuery({
    queryKey: lessonKeys.audio(lessonId ?? ""),
    queryFn: () => aiApi.fetchLessonAudio({ lessonId: lessonId! }),
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000,
  });
}
