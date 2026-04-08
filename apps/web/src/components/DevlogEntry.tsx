import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GitBranch, Pencil, Trash2 } from "lucide-react";
import type { DevlogEntry as DevlogEntryType, Attachment } from "@/types";
import { canAccessExternalLink } from "@/lib/privacy";
import { CommentIcon } from "./Icons";
import { MarkdownBody } from "./MarkdownBody";
import { CreatePostForm } from "./CreatePostForm";
import { cn } from "@/lib/utils";

function AttachmentGrid({ attachments }: { attachments: Attachment[] }) {
  const count = attachments.length;
  const gridClass = count === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={cn("mt-2 grid gap-1", gridClass)}>
      {attachments.map((att, i) => {
        if (att.type === "video") {
          return (
            <video
              key={i}
              src={att.url}
              controls
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full border border-border"
            />
          );
        }
        // GIFs and images
        return (
          <div key={i} className="group/img relative">
            <img
              src={att.url}
              alt=""
              className={cn(
                "w-full border border-border object-cover",
                count === 1 ? "max-h-80" : "h-40",
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

export function DevlogEntry({
  entry,
  commitmentId,
  repo,
  isPrivate,
  showMessages = true,
  showHashes = true,
  showBranches = true,
  authorLinks = false,
  isLatest = false,
  status = "building",
  isDetailPage = false,
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
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const removePost = useMutation(api.devlog.remove);
  const showPulse = isLatest && status === "building";

  if (entry.type === "commit" || entry.type === "git_commit") {
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

  // --- Post rendering ---

  if (editing) {
    return (
      <div className="relative py-2.5 pl-6">
        <span className="absolute left-0 top-4 h-[7px] w-[7px] -translate-x-[3.5px] rounded-full border border-accent/50 bg-accent" />
        <CreatePostForm
          commitmentId={commitmentId}
          editEntry={{
            id: entry.id,
            body: entry.body,
            attachments: entry.attachments,
          }}
          onClose={() => setEditing(false)}
        />
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

        {/* Edit / Delete for own posts */}
        {entry.isOwn && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex cursor-pointer items-center border-none bg-transparent text-[#333] transition-colors hover:text-muted-foreground"
              aria-label="Edit post"
            >
              <Pencil size={10} />
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await removePost({ entryId: entry.id });
                    } catch {
                      // Mutation error surfaces via Convex error handler
                    }
                    setConfirmDelete(false);
                  }}
                  className="cursor-pointer border-none bg-transparent text-[11px] text-destructive transition-colors hover:text-destructive/80"
                >
                  confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="cursor-pointer border-none bg-transparent text-[11px] text-[#333] transition-colors hover:text-muted-foreground"
                >
                  cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex cursor-pointer items-center border-none bg-transparent text-[#333] transition-colors hover:text-destructive"
                aria-label="Delete post"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Post content */}
      {isDetailPage && entry.body ? (
        <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          <MarkdownBody content={entry.body} />
        </div>
      ) : (
        <>
          {!isDetailPage && (
            <Link
              to={`/commitment/${commitmentId}`}
              className="mt-1 block text-[13px] font-semibold text-foreground-bright no-underline transition-colors hover:text-accent"
            >
              {entry.text}
            </Link>
          )}
          {isDetailPage && entry.text && (
            <p className="mt-1 text-[13px] text-foreground-bright">{entry.text}</p>
          )}
          {entry.body && !isDetailPage && (
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {entry.body.length > 160 ? `${entry.body.slice(0, 160)}\u2026` : entry.body}
            </p>
          )}
        </>
      )}

      {/* Attachments */}
      {entry.attachments && entry.attachments.length > 0 ? (
        <AttachmentGrid attachments={entry.attachments} />
      ) : (
        entry.image && (
          <div className="group/img relative mt-2 shrink-0">
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
        )
      )}
    </div>
  );
}
