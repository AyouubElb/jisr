"use client";

import { useEffect, useRef } from "react";
import { Maximize2 } from "lucide-react";

export function VideoPlayer(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handler = (): void => {
      const video = videoRef.current;
      if (!video) return;
      if (document.fullscreenElement === null) {
        video.muted = true;
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleFullscreen = async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.currentTime = 0;
    void video.play();
    try {
      await video.requestFullscreen();
    } catch {}
  };

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950 via-amber-900 to-stone-900 shadow-2xl shadow-amber-950/20 ring-1 ring-amber-950/10">
      <video
        ref={videoRef}
        src="/videos/demo.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      >
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      <div className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-950 shadow-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        Démo Jisr
      </div>

      <button
        type="button"
        onClick={handleFullscreen}
        aria-label="Voir la démo en plein écran"
        className="absolute right-4 bottom-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-amber-950 opacity-80 shadow-sm transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Plein écran</span>
      </button>
    </div>
  );
}
