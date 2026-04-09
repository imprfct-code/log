import { VideoPlayer } from "./VideoPlayer";

export function CoverMedia({
  url,
  storageKey,
  type,
  duration,
  widthPercent,
  onImageClick,
}: {
  url: string;
  storageKey?: string;
  type: "image" | "video";
  duration?: number;
  widthPercent?: number | null;
  onImageClick?: (url: string) => void;
}) {
  const wrapper = widthPercent ? { width: `${widthPercent}%` } : undefined;

  if (type === "video") {
    return (
      <div style={wrapper}>
        <VideoPlayer url={url} storageKey={storageKey} mode="inline" duration={duration} />
      </div>
    );
  }
  return (
    <div style={wrapper}>
      <button
        type="button"
        onClick={() => onImageClick?.(url)}
        className="mt-2 block w-full cursor-pointer border-none bg-transparent p-0"
      >
        <img
          src={url}
          alt=""
          loading="lazy"
          className="w-full border border-border transition-opacity hover:opacity-80"
        />
      </button>
    </div>
  );
}
