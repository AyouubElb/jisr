"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { materialsApi } from "@/lib/api/materials.api";

interface AudioRecorderProps {
  maxDurationSeconds: number;
  courseId: string;
  quizId: string;
  attemptId: string;
  blockId: string;
  currentPath?: string;
  onRecorded: (path: string, durationSeconds: number) => void;
}

const PREFERRED_MIME = "audio/webm;codecs=opus";
const FALLBACK_MIME = "audio/mp4";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported(FALLBACK_MIME)) return FALLBACK_MIME;
  return "";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioRecorder({
  maxDurationSeconds,
  courseId,
  quizId,
  attemptId,
  blockId,
  currentPath,
  onRecorded,
}: AudioRecorderProps): React.JSX.Element {
  const [status, setStatus] = useState<"idle" | "recording" | "uploading">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const localUrlRef = useRef<string | null>(null);

  // If we have a stored path (e.g. after reload) and no in-memory blob URL, fetch signed URL
  useEffect(() => {
    if (!currentPath || localUrlRef.current) return;
    let cancelled = false;
    materialsApi
      .getSignedUrl(currentPath)
      .then((url) => {
        if (!cancelled) setPlaybackUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentPath]);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
    };
  }, [cleanup]);

  const handleStart = async (): Promise<void> => {
    const mimeType = pickMimeType();
    if (!mimeType) {
      toast.error("Votre navigateur ne supporte pas l'enregistrement audio");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const duration = Math.max(
          1,
          Math.round((Date.now() - startTsRef.current) / 1000),
        );
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setStatus("uploading");
        try {
          const ext = mimeType.includes("webm") ? "webm" : "m4a";
          const file = new File([blob], `answer.${ext}`, { type: mimeType });
          const path = await materialsApi.uploadQuizAnswer(file, {
            courseId,
            quizId,
            attemptId,
            blockId,
          });
          if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
          const localUrl = URL.createObjectURL(blob);
          localUrlRef.current = localUrl;
          setPlaybackUrl(localUrl);
          onRecorded(path, duration);
        } catch {
          toast.error("Erreur lors de l'envoi de l'audio. Veuillez réessayer.");
        } finally {
          setStatus("idle");
        }
      };

      startTsRef.current = Date.now();
      recorder.start();
      setStatus("recording");
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startTsRef.current) / 1000);
        setElapsed(s);
        if (s >= maxDurationSeconds && recorder.state === "recording") {
          recorder.stop();
        }
      }, 250);
    } catch (err) {
      toast.error(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Autorisation du microphone refusée"
          : "Impossible d'accéder au microphone",
      );
    }
  };

  const handleStop = (): void => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const handleRestart = (): void => {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
    setPlaybackUrl(null);
    setElapsed(0);
    onRecorded("", 0);
    void handleStart();
  };

  const hasRecording = !!playbackUrl || !!currentPath;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      {status === "recording" && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-medium">Enregistrement...</span>
            <span className="tabular-nums text-xs text-muted-foreground">
              {formatTime(elapsed)} / {formatTime(maxDurationSeconds)}
            </span>
          </div>
          <Button size="sm" variant="destructive" onClick={handleStop}>
            <Square className="mr-1.5 h-3.5 w-3.5" />
            Arreter
          </Button>
        </div>
      )}

      {status === "uploading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Envoi de l&apos;enregistrement...
        </div>
      )}

      {status === "idle" && !hasRecording && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Duree maximum : {formatTime(maxDurationSeconds)}
          </p>
          <Button size="sm" onClick={handleStart}>
            <Mic className="mr-1.5 h-3.5 w-3.5" />
            Enregistrer
          </Button>
        </div>
      )}

      {status === "idle" && hasRecording && playbackUrl && (
        <div className="space-y-2">
          <audio controls src={playbackUrl} className="w-full" />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleRestart}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Recommencer
            </Button>
          </div>
        </div>
      )}

      {status === "idle" && hasRecording && !playbackUrl && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      )}
    </div>
  );
}
