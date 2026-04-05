import { useState } from "react";
import type { DevlogEntry as DevlogEntryType } from "@/data/mock";
import { DevlogEntry } from "./DevlogEntry";
import { CommentThread } from "./CommentThread";
import { CommentInput } from "./CommentInput";
import { cn } from "@/lib/utils";

export function DevlogTimeline({
  entries,
  commitmentId,
  status,
  limit = 4,
}: {
  entries: DevlogEntryType[];
  commitmentId: number;
  status: "building" | "shipped";
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openInputs, setOpenInputs] = useState<Set<number>>(new Set());

  const hasOverflow = entries.length > limit;

  function toggleComment(index: number) {
    setOpenInputs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function renderEntry(entry: DevlogEntryType, index: number) {
    const hasComments = entry.commentData && entry.commentData.length > 0;

    return (
      <div key={index}>
        <DevlogEntry
          entry={entry}
          commitmentId={commitmentId}
          isLatest={index === 0}
          status={status}
          onCommentClick={() => toggleComment(index)}
        />

        {hasComments && (
          <div className="pl-6 pb-2">
            <CommentThread comments={entry.commentData!} />
          </div>
        )}

        {openInputs.has(index) && !hasComments && (
          <div className="pl-6 pb-2">
            <div className="mt-1 border-l-2 border-border-strong px-3.5 py-1.5">
              <CommentInput autoFocus />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-visible border-l border-border-strong">
      {entries.slice(0, limit).map((entry, i) => renderEntry(entry, i))}

      {hasOverflow && (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-y-hidden overflow-x-visible">
            {entries.slice(limit).map((entry, i) => renderEntry(entry, limit + i))}
          </div>
        </div>
      )}

      {hasOverflow && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="cursor-pointer border-none bg-transparent py-1.5 pl-6 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? "show less" : `+${entries.length - limit} more`}
        </button>
      )}
    </div>
  );
}
