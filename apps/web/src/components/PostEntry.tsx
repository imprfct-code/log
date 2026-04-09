import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Pencil, Trash2 } from "lucide-react";
import type { DevlogEntry as DevlogEntryType } from "@/types";
import {
  stripBodyForPreview,
  parseMediaWidth,
  computeDetailBody,
  needsUnifiedDisplay,
} from "@/lib/postContent";
import { CommentBadge } from "./CommentBadge";
import { MarkdownBody } from "./MarkdownBody";
import { CreatePostForm } from "./CreatePostForm";
import { AttachmentGrid } from "./AttachmentGrid";
import { CoverMedia } from "./CoverMedia";
import { VideoPlayer } from "./VideoPlayer";
import { cn } from "@/lib/utils";

export function PostEntry({
  entry,
  commitmentId,
  isLatest = false,
  status = "building",
  isDetailPage = false,
  onCommentClick,
}: {
  entry: DevlogEntryType;
  commitmentId: Id<"commitments">;
  isLatest?: boolean;
  status?: "building" | "shipped";
  isDetailPage?: boolean;
  onCommentClick?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const removePost = useMutation(api.devlog.remove);
  const showPulse = isLatest && status === "building";

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

  const allAtts = entry.attachments ?? [];
  const cover = isDetailPage ? allAtts[0] : undefined;
  const remainingAtts = isDetailPage
    ? allAtts.filter((a) => a.key !== cover?.key && !a.inline)
    : [];
  const detailBody = isDetailPage ? computeDetailBody(entry.body, cover?.key) : undefined;
  const isUnified = needsUnifiedDisplay(entry.body);
  const feedThumb = !isDetailPage ? allAtts[0] : undefined;
  const thumbWidth = feedThumb && entry.body ? parseMediaWidth(entry.body, feedThumb.key) : null;
  const feedBodyStripped = !isDetailPage && entry.body ? stripBodyForPreview(entry.body) : null;
  const feedBodyPreview =
    feedBodyStripped && feedBodyStripped.length > 200
      ? feedBodyStripped.slice(0, 200) + "\u2026"
      : feedBodyStripped;

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
        <CommentBadge count={entry.comments} onClick={onCommentClick} />

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
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await removePost({ entryId: entry.id });
                    } catch (err) {
                      console.error("Failed to delete post:", err);
                    }
                    setIsDeleting(false);
                    setConfirmDelete(false);
                  }}
                  className="cursor-pointer border-none bg-transparent text-[11px] text-destructive transition-colors hover:text-destructive/80 disabled:pointer-events-none disabled:opacity-40"
                >
                  {isDeleting ? "deleting..." : "confirm"}
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
      {isDetailPage && (entry.body || cover) ? (
        <>
          {entry.text && !isUnified && (
            <Link
              to={`/post/${entry.id}`}
              className="mt-1 block text-[13px] font-semibold text-foreground-bright no-underline transition-colors hover:text-accent"
            >
              {entry.text}
            </Link>
          )}
          {cover && (
            <CoverMedia
              url={cover.url}
              storageKey={cover.key}
              type={cover.type}
              duration={cover.duration}
              widthPercent={entry.body ? parseMediaWidth(entry.body, cover.key) : null}
            />
          )}
          {detailBody && (
            <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              <MarkdownBody content={detailBody} attachments={entry.attachments} />
            </div>
          )}
          {remainingAtts.length > 0 && <AttachmentGrid attachments={remainingAtts} />}
        </>
      ) : (
        <div className="mt-1">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              {isUnified && entry.body ? (
                <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                  <Link
                    to={`/post/${entry.id}`}
                    className="text-muted-foreground no-underline transition-colors hover:text-accent"
                  >
                    {entry.body.length > 200 ? entry.body.slice(0, 200) + "\u2026" : entry.body}
                  </Link>
                  {entry.body.length > 200 && (
                    <Link
                      to={`/post/${entry.id}`}
                      className="text-[11px] text-muted-foreground no-underline transition-colors hover:text-accent"
                    >
                      {" "}
                      read more
                    </Link>
                  )}
                </p>
              ) : (
                <>
                  <Link
                    to={`/post/${entry.id}`}
                    className="block text-[13px] font-semibold text-foreground-bright no-underline transition-colors hover:text-accent"
                  >
                    {entry.text}
                  </Link>
                  {feedBodyPreview && (
                    <p className="mt-0.5 line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
                      {feedBodyPreview}
                      {feedBodyStripped && feedBodyStripped.length > 200 ? (
                        <Link
                          to={`/post/${entry.id}`}
                          className="text-[11px] text-muted-foreground no-underline transition-colors hover:text-accent"
                        >
                          {" "}
                          read more
                        </Link>
                      ) : null}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          {feedThumb && (
            <div
              className="mt-2 overflow-hidden"
              style={thumbWidth ? { width: `${thumbWidth}%` } : undefined}
            >
              {feedThumb.type === "video" ? (
                <VideoPlayer
                  url={feedThumb.url}
                  storageKey={feedThumb.key}
                  mode="inline"
                  duration={feedThumb.duration}
                />
              ) : (
                <Link to={`/post/${entry.id}`}>
                  <img
                    src={feedThumb.url}
                    alt=""
                    className="w-full border border-border object-cover transition-opacity hover:opacity-80"
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legacy single image support */}
      {!entry.attachments?.length && entry.image && (
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
      )}
    </div>
  );
}
