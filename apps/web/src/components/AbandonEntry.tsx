import type { DevlogEntry as DevlogEntryType } from "@/types";
import { CommentBadge } from "./CommentBadge";

/** Display an abandon entry in the devlog timeline. */
export function AbandonEntry({
  entry,
  onCommentClick,
}: {
  entry: DevlogEntryType;
  onCommentClick?: () => void;
}) {
  return (
    <div className="relative py-2.5 pl-6">
      <span className="absolute left-0 top-4 h-[7px] w-[7px] -translate-x-[4px] rounded-full border border-muted-foreground/40 bg-muted-foreground/40" />

      <div className="flex items-baseline gap-2 text-[11px]">
        <span className="text-muted-foreground/60">abandoned</span>
        <span className="ml-auto flex items-center gap-2">
          <CommentBadge count={entry.comments} onClick={onCommentClick} />
          <span className="text-[#333]">{entry.time}</span>
        </span>
      </div>

      {entry.body && (
        <p className="mt-1 text-[11px] italic text-muted-foreground/60">
          &ldquo;{entry.body}&rdquo;
        </p>
      )}
    </div>
  );
}
