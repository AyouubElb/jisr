"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type AutosaveStatus = "idle" | "saving-local" | "saving-db" | "saved" | "restored";

interface UseAutosaveOptions<T> {
  key: string;
  data: T;
  /** Called to persist to DB. Should return a Promise. */
  onSave: (data: T) => Promise<void>;
  /** If true, autosave is active. Pass false while form is still loading from DB. */
  enabled: boolean;
  /** Debounce before writing to localStorage (ms). Default 1000. */
  localDebounceMs?: number;
  /** Debounce before writing to DB (ms). Default 7000. */
  dbDebounceMs?: number;
}

interface UseAutosaveReturn<T> {
  status: AutosaveStatus;
  /** Draft found in localStorage on mount — call this to apply it. */
  pendingRestore: T | null;
  acceptRestore: () => void;
  discardRestore: () => void;
  /** Manually clear the localStorage draft (call after explicit save). */
  clearDraft: () => void;
}

export function useAutosave<T>({
  key,
  data,
  onSave,
  enabled,
  localDebounceMs = 1000,
  dbDebounceMs = 7000,
}: UseAutosaveOptions<T>): UseAutosaveReturn<T> {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [pendingRestore, setPendingRestore] = useState<T | null>(null);

  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestData = useRef(data);
  const isMounted = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Check localStorage for a draft on mount (only once, before enabled flips true)
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as T;
      setPendingRestore(draft);
    } catch {
      localStorage.removeItem(key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Track latest data value without re-running the debounce effect
  useEffect(() => {
    latestData.current = data;
  }, [data]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  const acceptRestore = useCallback(() => {
    setPendingRestore(null);
    setStatus("restored");
    setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const discardRestore = useCallback(() => {
    setPendingRestore(null);
    clearDraft();
  }, [clearDraft]);

  // Main autosave effect — fires whenever data changes and enabled is true
  useEffect(() => {
    if (!enabled) return;
    // Skip the very first render after enabled flips true (that's the hydration)
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // 1s debounce → localStorage
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => {
      setStatus("saving-local");
      try {
        localStorage.setItem(key, JSON.stringify(latestData.current));
      } catch {
        // quota exceeded — silently skip
      }
      setStatus("idle");
    }, localDebounceMs);

    // 7s debounce → DB
    if (dbTimer.current) clearTimeout(dbTimer.current);
    dbTimer.current = setTimeout(() => {
      setStatus("saving-db");
      void onSaveRef.current(latestData.current).then(() => {
        clearDraft();
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      }).catch(() => {
        setStatus("idle");
      });
    }, dbDebounceMs);

    return () => {
      if (localTimer.current) clearTimeout(localTimer.current);
      if (dbTimer.current) clearTimeout(dbTimer.current);
    };
  // data is intentionally the only reactive dep — the rest are stable refs/values
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enabled]);

  return { status, pendingRestore, acceptRestore, discardRestore, clearDraft };
}
