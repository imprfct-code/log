import { useState } from "react";
import type { Id } from "@convex/_generated/dataModel";
import type { DevlogEntry as DevlogEntryType } from "@/types";
import { DevlogEntry } from "./DevlogEntry";
import { CommentThread } from "./CommentThread";
import { CommentInput } from "./CommentInput";
import { cn } from "@/lib/utils";

export function DevlogTimeline({
  entries,
  commitmentId,
  repo,
  isPrivate,
  showMessages = true,
  showHashes = true,
  showBranches = true,
  authorLinks = false,
  status,
  shipUrl,
  isDetailPage = false,
  limit = 4,
  onLoadMore,
}: {
  entries: DevlogEntryType[];
  commitmentId: Id<"commitments">;
  repo?: string;
  isPrivate?: boolean;
  showMessages?: boolean;
  showHashes?: boolean;
  showBranches?: boolean;
  authorLinks?: boolean;
  status: "building" | "shipped";
  shipUrl?: string;
  isDetailPage?: boolean;
  limit?: number;
  onLoadMore?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openInputs, setOpenInputs] = useState<Set<string>>(new Set());

  const hasOverflow = !isDetailPage && entries.length > limit;

  function toggleComment(entryId: string) {
    setOpenInputs((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  function renderEntry(entry: DevlogEntryType, index: number) {
    const hasComments = entry.commentData && entry.commentData.length > 0;

    return (
      <div key={entry.id}>
        <DevlogEntry
          entry={entry}
          commitmentId={commitmentId}
          repo={repo}
          isPrivate={isPrivate}
          showMessages={showMessages}
          showHashes={showHashes}
          showBranches={showBranches}
          authorLinks={authorLinks}
          isLatest={index === 0}
          status={status}
          shipUrl={shipUrl}
          isDetailPage={isDetailPage}
          onCommentClick={() => toggleComment(entry.id)}
        />

        {hasComments && (
          <div className="pl-6 pb-2">
            <CommentThread comments={entry.commentData!} />
          </div>
        )}

        {openInputs.has(entry.id) && !hasComments && (
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
      {(isDetailPage ? entries : entries.slice(0, limit)).map((entry, i) => renderEntry(entry, i))}

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

      {isDetailPage && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="cursor-pointer border-none bg-transparent py-1.5 pl-6 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          load more
        </button>
      )}
    </div>
  );
}
