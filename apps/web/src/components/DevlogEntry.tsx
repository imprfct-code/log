import type { Id } from "@convex/_generated/dataModel";
import type { DevlogEntry as DevlogEntryType } from "@/types";
import { CommitEntry } from "./CommitEntry";
import { PostEntry } from "./PostEntry";
import { ShipEntry } from "./ShipEntry";

export function DevlogEntry({
  entry,
  commitmentId,
  repo,
  isPrivate,
  showMessages,
  showHashes,
  showBranches,
  authorLinks,
  isLatest,
  status,
  isDetailPage,
  onCommentClick,
}: {
  entry: DevlogEntryType;
  commitmentId: Id<"commitments">;
  repo?: string;
  isPrivate?: boolean;
  showMessages?: boolean;
  showHashes?: boolean;
  showBranches?: boolean;
  authorLinks?: boolean;
  isLatest?: boolean;
  status?: "building" | "shipped";
  isDetailPage?: boolean;
  onCommentClick?: () => void;
}) {
  if (entry.type === "ship") {
    return <ShipEntry entry={entry} />;
  }
  if (entry.type === "commit" || entry.type === "git_commit") {
    return (
      <CommitEntry
        entry={entry}
        repo={repo}
        isPrivate={isPrivate}
        showMessages={showMessages}
        showHashes={showHashes}
        showBranches={showBranches}
        authorLinks={authorLinks}
        isLatest={isLatest}
        status={status}
        onCommentClick={onCommentClick}
      />
    );
  }
  return (
    <PostEntry
      entry={entry}
      commitmentId={commitmentId}
      isLatest={isLatest}
      status={status}
      isDetailPage={isDetailPage}
      onCommentClick={onCommentClick}
    />
  );
}
