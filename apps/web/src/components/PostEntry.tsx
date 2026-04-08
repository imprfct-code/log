import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Pencil, Trash2 } from "lucide-react";
import type { DevlogEntry as DevlogEntryType } from "@/types";
import { CommentBadge } from "./CommentBadge";
import { MarkdownBody } from "./MarkdownBody";
import { CreatePostForm } from "./CreatePostForm";
import { AttachmentGrid } from "./AttachmentGrid";
import { CoverMedia } from "./CoverMedia";
import { VideoPlayer } from "./VideoPlayer";
import { cn } from "@/lib/utils";

/** Strip the first line (title) and inline media refs from body for feed/detail preview. */
function stripBodyForPreview(body: string): string {
  return body
    .replace(/^.*\n?/, "")
    .replace(/!\[[^\]]*?\]\([^)]+\)\n?/g, "")
    .trim();
}

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
  const remainingAtts = isDetailPage ? allAtts.slice(1).filter((a) => !a.inline) : [];
  const detailBody = (() => {
    if (!isDetailPage || !entry.body) return entry.body;
    let body = stripBodyForPreview(entry.body);
    if (cover) {
      const escaped = cover.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      body = body.replace(new RegExp(`!\\[[^\\]]*?\\]\\(upload:${escaped}\\)\\n?`, "g"), "").trim();
    }
    return body || undefined;
  })();
  const feedThumb = !isDetailPage ? allAtts[0] : undefined;
  const isCover = feedThumb?.cover ?? feedThumb?.type === "video";
  const feedBodyPreview = (() => {
    if (isDetailPage || !entry.body) return null;
    const clean = stripBodyForPreview(entry.body);
    if (!clean) return null;
    return clean.length > 200 ? `${clean.slice(0, 200)}\u2026` : clean;
  })();

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
          {entry.text && (
            <p className="mt-1 text-[13px] font-semibold text-foreground-bright">{entry.text}</p>
          )}
          {cover && <CoverMedia url={cover.url} type={cover.type} duration={cover.duration} />}
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
              <Link
                to={`/commitment/${commitmentId}`}
                className="block text-[13px] font-semibold text-foreground-bright no-underline transition-colors hover:text-accent"
              >
                {entry.text}
              </Link>
              {feedBodyPreview && (
                <div className="mt-0.5 line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
                  <MarkdownBody content={feedBodyPreview} />
                </div>
              )}
            </div>
            {feedThumb && !isCover && (
              <Link to={`/commitment/${commitmentId}`} className="shrink-0">
                <img
                  src={feedThumb.url}
                  alt=""
                  className="h-16 w-24 border border-border object-cover transition-opacity hover:opacity-80"
                />
              </Link>
            )}
          </div>
          {feedThumb && isCover && (
            <div className="mt-2 overflow-hidden">
              {feedThumb.type === "video" ? (
                <VideoPlayer url={feedThumb.url} mode="inline" duration={feedThumb.duration} />
              ) : (
                <Link to={`/commitment/${commitmentId}`}>
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
