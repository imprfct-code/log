import { Link } from "react-router";
import { GitBranch } from "lucide-react";
import type { DevlogEntry as DevlogEntryType } from "@/types";
import { CommentIcon } from "./Icons";
import { cn } from "@/lib/utils";

export function DevlogEntry({
  entry,
  commitmentId,
  repo,
  isLatest = false,
  status = "building",
  onCommentClick,
}: {
  entry: DevlogEntryType;
  commitmentId: string;
  repo?: string;
  isLatest?: boolean;
  status?: "building" | "shipped";
  onCommentClick?: () => void;
}) {
  const showPulse = isLatest && status === "building";

  if (entry.type === "commit" || entry.type === "git_commit") {
    const hashDisplay = entry.hash ? entry.hash.slice(0, 7) : undefined;
    const hashElement = hashDisplay ? (
      entry.gitUrl ? (
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
      entry.gitBranch && entry.gitBranch !== "main" && entry.gitBranch !== "master";
    const branchHref =
      showBranch && repo ? `https://github.com/${repo}/tree/${entry.gitBranch}` : undefined;

    return (
      <div className="relative flex items-baseline gap-2.5 py-1.5 pl-6 text-[13px]">
        <span
          className={cn(
            "absolute left-0 top-1/2 h-[7px] w-[7px] -translate-x-[3.5px] -translate-y-1/2 rounded-full border border-border-strong bg-muted",
            showPulse && "border-accent bg-accent pulse-dot",
          )}
        />

        {hashElement}
        {showBranch &&
          (branchHref ? (
            <a
              href={branchHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 border border-border px-1 py-px text-[10px] text-[#555] no-underline transition-colors hover:border-accent/40 hover:text-accent"
            >
              <GitBranch size={10} />
              {entry.gitBranch}
            </a>
          ) : (
            <span className="flex shrink-0 items-center gap-1 border border-border px-1 py-px text-[10px] text-[#555]">
              <GitBranch size={10} />
              {entry.gitBranch}
            </span>
          ))}
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{entry.text}</span>
        {onCommentClick ? (
          <button
            onClick={onCommentClick}
            aria-label={`${entry.comments || 0} comments — toggle comment input`}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent text-[11px] transition-colors",
              entry.comments > 0
                ? "text-muted-foreground hover:text-foreground"
                : "text-[#333] hover:text-muted-foreground",
            )}
          >
            <CommentIcon size={10} color="currentColor" />
            {entry.comments > 0 && entry.comments}
          </button>
        ) : (
          entry.comments > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <CommentIcon size={10} color="#666" />
              {entry.comments}
            </span>
          )
        )}
        <span className="shrink-0 text-[11px] text-[#333]">{entry.time}</span>
      </div>
    );
  }

  return (
    <div className="relative py-2.5 pl-6">
      <span
        className={cn(
          "absolute left-0 top-4 h-[7px] w-[7px] -translate-x-[3.5px] rounded-full border border-accent/50 bg-accent",
          showPulse && "pulse-dot",
        )}
      />

      <div className="flex items-baseline gap-2 text-[11px]">
        <span className="text-accent">post</span>
        <span className="text-[#333]">{entry.time}</span>
        {onCommentClick ? (
          <button
            onClick={onCommentClick}
            aria-label={`${entry.comments || 0} comments — toggle comment input`}
            className={cn(
              "flex cursor-pointer items-center gap-1 border-none bg-transparent text-[11px] transition-colors",
              entry.comments > 0
                ? "text-muted-foreground hover:text-foreground"
                : "text-[#333] hover:text-muted-foreground",
            )}
          >
            <CommentIcon size={10} color="currentColor" />
            {entry.comments > 0 && entry.comments}
          </button>
        ) : (
          entry.comments > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CommentIcon size={10} color="#666" />
              {entry.comments}
            </span>
          )
        )}
      </div>

      <Link
        to={`/commitment/${commitmentId}`}
        className="mt-1 block text-[13px] font-semibold text-foreground-bright no-underline transition-colors hover:text-accent"
      >
        {entry.text}
      </Link>

      {(entry.body || entry.image) && (
        <div className="mt-1.5 flex gap-3">
          {entry.body && (
            <p className="m-0 min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
              {entry.body.length > 160 ? `${entry.body.slice(0, 160)}\u2026` : entry.body}
            </p>
          )}
          {entry.image && (
            <div className="group/img relative shrink-0">
              <img
                src={entry.image}
                alt=""
                className="h-16 w-24 border border-border object-cover transition-opacity group-hover/img:opacity-80"
              />
              <div className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 origin-bottom-right scale-95 opacity-0 transition-all duration-200 group-hover/img:scale-100 group-hover/img:opacity-100">
                <img
                  src={entry.image}
                  alt=""
                  className="w-72 border border-border-strong object-cover shadow-lg shadow-black/40"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
