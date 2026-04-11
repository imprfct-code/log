import { GitBranch } from "lucide-react";
import type { DevlogEntry as DevlogEntryType } from "@/types";
import { canAccessExternalLink } from "@/lib/privacy";
import { CommentBadge } from "./CommentBadge";
import { cn } from "@/lib/utils";

export function CommitEntry({
  entry,
  repo,
  isPrivate,
  showMessages = true,
  showHashes = true,
  showBranches = true,
  authorLinks = false,
  isLatest = false,
  status = "building",
  onCommentClick,
}: {
  entry: DevlogEntryType;
  repo?: string;
  isPrivate?: boolean;
  showMessages?: boolean;
  showHashes?: boolean;
  showBranches?: boolean;
  authorLinks?: boolean;
  isLatest?: boolean;
  status?: "building" | "shipped" | "abandoned";
  onCommentClick?: () => void;
}) {
  const showPulse = isLatest && status === "building";
  const hashDisplay = showHashes && entry.hash ? entry.hash.slice(0, 7) : undefined;
  const canLink = canAccessExternalLink(isPrivate, authorLinks);
  const hashElement = hashDisplay ? (
    canLink && entry.gitUrl ? (
      <a
        href={entry.gitUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-[11px] text-[#444] no-underline hover:text-accent"
      >
        {hashDisplay}
      </a>
    ) : (
      <span className="shrink-0 text-[11px] text-[#444]">{hashDisplay}</span>
    )
  ) : null;

  const showBranch =
    showBranches && entry.gitBranch && entry.gitBranch !== "main" && entry.gitBranch !== "master";
  const branchHref =
    showBranch && repo && canLink
      ? `https://github.com/${repo}/tree/${entry.gitBranch}`
      : undefined;

  const branchBadgeClass =
    "flex shrink-0 items-center gap-1 border border-border px-1 py-px text-[10px] text-[#555]";
  const renderBranchBadge = () =>
    branchHref ? (
      <a
        href={branchHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`${branchBadgeClass} no-underline transition-colors hover:border-accent/40 hover:text-accent`}
      >
        <GitBranch size={10} />
        {entry.gitBranch}
      </a>
    ) : (
      <span className={branchBadgeClass}>
        <GitBranch size={10} />
        {entry.gitBranch}
      </span>
    );

  return (
    <div className="relative flex items-baseline gap-2.5 py-1.5 pl-6 text-[13px]">
      <span
        className={cn(
          "absolute left-0 top-1/2 h-[7px] w-[7px] -translate-x-[3.5px] -translate-y-1/2 rounded-full border border-border-strong bg-muted",
          showPulse && "border-accent bg-accent pulse-dot",
        )}
      />

      {hashElement}
      {showBranch && renderBranchBadge()}
      <span
        className={cn("min-w-0 flex-1 truncate text-muted-foreground", !showMessages && "italic")}
      >
        {showMessages ? entry.text : "private commit"}
      </span>
      <CommentBadge count={entry.comments} onClick={onCommentClick} />
      <span className="shrink-0 text-[11px] text-[#333]">{entry.time}</span>
    </div>
  );
}
