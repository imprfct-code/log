import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";
import { VideoPlayer } from "./VideoPlayer";

export function AttachmentGrid({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  const count = attachments.length;
  const gridClass = count === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={cn("mt-2 grid gap-1", gridClass)}>
      {attachments.map((att, i) => {
        if (att.type === "video") {
          return (
            <div
              key={i}
              className={cn(
                "w-full border border-border overflow-hidden",
                count === 1 ? "max-h-96" : "h-56",
              )}
            >
              <VideoPlayer url={att.url} />
            </div>
          );
        }
        return (
          <div key={i} className="group/img relative">
            <img
              src={att.url}
              alt=""
              className={cn(
                "w-full border border-border object-cover",
                count === 1 ? "max-h-48" : "h-40",
              )}
            />
            <div className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 origin-bottom-right scale-95 opacity-0 transition-all duration-200 group-hover/img:scale-100 group-hover/img:opacity-100">
              <img
                src={att.url}
                alt=""
                className="w-72 border border-border-strong object-cover shadow-lg shadow-black/40"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
