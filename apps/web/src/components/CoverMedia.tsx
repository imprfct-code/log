import { VideoPlayer } from "./VideoPlayer";

export function CoverMedia({
  url,
  type,
  duration,
  widthPercent,
}: {
  url: string;
  type: "image" | "video";
  duration?: number;
  widthPercent?: number | null;
}) {
  const wrapper = widthPercent ? { width: `${widthPercent}%` } : undefined;

  if (type === "video") {
    return (
      <div style={wrapper}>
        <VideoPlayer url={url} mode="inline" duration={duration} />
      </div>
    );
  }
  return (
    <div style={wrapper}>
      <img
        src={url}
        alt=""
        loading="lazy"
        className="mt-2 w-full max-h-80 border border-border object-cover"
      />
    </div>
  );
}
