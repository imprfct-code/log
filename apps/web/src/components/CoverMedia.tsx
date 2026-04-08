import { VideoPlayer } from "./VideoPlayer";

export function CoverMedia({ url, type }: { url: string; type: "image" | "video" }) {
  if (type === "video") {
    return <VideoPlayer url={url} />;
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
