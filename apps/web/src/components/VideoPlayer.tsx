import { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

interface VideoPlayerProps {
  url: string;
  title?: string;
  mode?: "full" | "thumbnail";
}

export function VideoPlayer({ url, title, mode = "full" }: VideoPlayerProps) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!playerRef.current || mode === "thumbnail") return;

    // Initialize Plyr with custom config for full player
    const player = new Plyr(playerRef.current, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "settings",
        "pip",
        "fullscreen",
      ],
      settings: ["speed"],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
      tooltips: { controls: true, seek: true },
      ratio: "16:9",
    });

    plyrRef.current = player;

    return () => {
      if (plyrRef.current) {
        plyrRef.current.destroy();
      }
    };
  }, [mode]);

  if (mode === "thumbnail") {
    return (
      <div className="group/video relative h-full w-full overflow-hidden bg-card">
        <video src={url} preload="metadata" className="h-full w-full object-cover" />
        {/* Play button overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 transition-all duration-200 group-hover/video:bg-black/40">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const video = (e.currentTarget.closest(".group/video") as HTMLElement)?.querySelector(
                "video",
              ) as HTMLVideoElement;
              if (video) {
                void video.play();
              }
            }}
            className="pointer-events-auto flex items-center justify-center bg-white/90 p-2 shadow-lg transition-transform hover:scale-110 active:scale-95"
            aria-label="Play video"
          >
            <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-wrapper">
      <video
        ref={playerRef}
        src={url}
        title={title}
        preload="metadata"
        playsInline
        className="mt-2 w-full border border-border"
      />
    </div>
  );
}
