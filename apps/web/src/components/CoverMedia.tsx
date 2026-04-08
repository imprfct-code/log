import { VideoPlayer } from "./VideoPlayer";

export function CoverMedia({
  url,
  type,
  duration,
}: {
  url: string;
  type: "image" | "video";
  duration?: number;
}) {
  if (type === "video") {
    return <VideoPlayer url={url} mode="inline" duration={duration} />;
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="mt-2 w-full max-h-80 border border-border object-cover"
    />
  );
}
