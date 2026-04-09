import { memo, useCallback, useEffect, useRef, useState } from "react";
import Plyr from "plyr";
import type { PlyrOptions } from "plyr";
import "plyr/dist/plyr.css";

interface VideoPlayerProps {
  url: string;
  /** Stable R2 storage key — used for memo identity so presigned URL rotation doesn't remount. */
  storageKey?: string;
  title?: string;
  mode?: "full" | "inline" | "thumbnail";
  /** Known duration in seconds — avoids progressive download duration issues. */
  duration?: number;
}

const FULL_CONTROLS = [
  "play-large",
  "play",
  "progress",
  "current-time",
  "duration",
  "mute",
  "volume",
  "settings",
  "pip",
  "fullscreen",
];

const INLINE_CONTROLS = [
  "play",
  "progress",
  "current-time",
  "duration",
  "mute",
  "volume",
  "fullscreen",
];

function LoadingOverlay() {
  return (
    <div className="video-loading-overlay">
      <div className="video-loading-bars">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function PlayOverlay({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="video-inline-overlay"
      aria-label="Play video"
    >
      <span className="video-inline-play">
        <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}

function VideoPlayerInner({ url, title, mode = "full", duration }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const videoCleanupRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activated, setActivated] = useState(mode === "full");

  // Silently update video src when presigned URL rotates, without remounting.
  // Only update paused videos — playing videos keep their still-valid (24h expiry) URL.
  useEffect(() => {
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.src = url;
    }
  }, [url]);

  const attachVideoEvents = useCallback((video: HTMLVideoElement) => {
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onPlaying = () => setIsLoading(false);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);
    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  const initPlyr = useCallback(
    (controls: string[]) => {
      if (!videoRef.current || plyrRef.current) return null;

      const options: PlyrOptions = {
        controls,
        settings: mode === "full" ? ["speed"] : [],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
        tooltips: { controls: true, seek: true },
        invertTime: false,
        displayDuration: true,
        ...(duration != null ? { duration: Math.round(duration) } : {}),
      };

      const player = new Plyr(videoRef.current, options);
      plyrRef.current = player;
      return player;
    },
    [mode, duration],
  );

  // Full mode: init Plyr + events immediately
  useEffect(() => {
    if (mode !== "full" || !videoRef.current) return;
    const cleanup = attachVideoEvents(videoRef.current);
    initPlyr(FULL_CONTROLS);
    return () => {
      cleanup();
      plyrRef.current?.destroy();
      plyrRef.current = null;
    };
  }, [mode, initPlyr, attachVideoEvents]);

  // Cleanup for inline mode on unmount
  useEffect(() => {
    if (mode !== "inline") return;
    return () => {
      videoCleanupRef.current?.();
      videoCleanupRef.current = null;
      plyrRef.current?.destroy();
      plyrRef.current = null;
    };
  }, [mode]);

  function handleInlinePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!videoRef.current) return;

    setActivated(true);
    setIsLoading(true);

    videoCleanupRef.current = attachVideoEvents(videoRef.current);

    requestAnimationFrame(() => {
      initPlyr(INLINE_CONTROLS);
      videoRef.current?.play().catch((err) => {
        console.debug("Autoplay blocked", err);
        setIsLoading(false);
      });
    });
  }

  if (mode === "thumbnail") {
    return (
      <div className="group/video relative h-full w-full overflow-hidden bg-card">
        <video src={url} preload="metadata" className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 transition-all duration-200 group-hover/video:bg-black/40">
          <span className="flex items-center justify-center bg-white/90 p-2 shadow-lg">
            <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-wrapper relative">
      <video
        ref={videoRef}
        src={url}
        title={title}
        preload="metadata"
        playsInline
        className="mt-2 w-full border border-border"
      />
      {isLoading && <LoadingOverlay />}
      {mode === "inline" && !activated && <PlayOverlay onClick={handleInlinePlay} />}
    </div>
  );
}

export const VideoPlayer = memo(VideoPlayerInner, (prev, next) => {
  const prevId = prev.storageKey ?? prev.url;
  const nextId = next.storageKey ?? next.url;
  return prevId === nextId && prev.mode === next.mode && prev.duration === next.duration;
});
