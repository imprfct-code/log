import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";
import { VideoPlayer } from "./VideoPlayer";

export function AttachmentGrid({
  attachments,
  onImageClick,
}: {
  attachments: Attachment[];
  onImageClick?: (url: string) => void;
}) {
  if (attachments.length === 0) return null;

  const count = attachments.length;
  const gridClass = count === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={cn("mt-2 grid gap-1", gridClass)}>
      {attachments.map((att) => {
        const widthStyle =
          att.widthPercent && att.widthPercent < 100
            ? { width: `${att.widthPercent}%` }
            : undefined;

        if (att.type === "video") {
          return (
            <div
              key={att.key}
              style={widthStyle}
              className={cn(
                "overflow-hidden border border-border",
                widthStyle ? "" : "w-full",
                count === 1 ? "max-h-96" : "h-56",
              )}
            >
              <VideoPlayer url={att.url} storageKey={att.key} duration={att.duration} />
            </div>
          );
        }
        return (
          <button
            key={att.key}
            type="button"
            onClick={() => onImageClick?.(att.url)}
            style={widthStyle}
            className={cn(
              "cursor-pointer border-none bg-transparent p-0",
              widthStyle ? "" : "w-full",
            )}
          >
            <img
              src={att.url}
              alt={att.filename || "attachment"}
              loading="lazy"
              className="w-full border border-border transition-opacity hover:opacity-80"
            />
          </button>
        );
      })}
    </div>
  );
}
