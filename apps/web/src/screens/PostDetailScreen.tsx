import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Pencil, Trash2 } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { MarkdownBody } from "@/components/MarkdownBody";
import { CoverMedia } from "@/components/CoverMedia";
import { AttachmentGrid } from "@/components/AttachmentGrid";
import { CreatePostForm } from "@/components/CreatePostForm";
import { CommentThread } from "@/components/CommentThread";
import { CommentInput } from "@/components/CommentInput";
import { computeDetailBody, parseMediaWidth, needsUnifiedDisplay } from "@/lib/postContent";
import { formatTimeAgo } from "@/lib/formatTime";

function DetailLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">{children}</div>;
}

function DetailMessage({ text }: { text: string }) {
  return <div className="py-16 text-center text-sm text-muted-foreground">{text}</div>;
}

export function PostDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Cast unavoidable: useParams returns string, Convex requires Id<"devlogEntries">.
  const entryId = id as Id<"devlogEntries"> | undefined;

  const data = useQuery(api.devlog.getById, entryId ? { id: entryId } : "skip");
  const comments = useQuery(
    api.comments.listByDevlogEntry,
    entryId ? { devlogEntryId: entryId } : "skip",
  );

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const removePost = useMutation(api.devlog.remove);

  if (!entryId) {
    return (
      <DetailLayout>
        <DetailMessage text="invalid post id." />
      </DetailLayout>
    );
  }

  if (data === undefined) {
    return (
      <DetailLayout>
        <DetailMessage text="loading..." />
      </DetailLayout>
    );
  }

  if (data === null) {
    return (
      <DetailLayout>
        <DetailMessage text="post not found." />
      </DetailLayout>
    );
  }

  const allAtts = data.resolvedAttachments ?? [];
  const cover = allAtts.find((a) => a.cover);
  const remainingAtts = allAtts.filter((a) => a.key !== cover?.key && !a.inline);

  const detailBody = computeDetailBody(data.body, cover?.key);
  const isUnified = needsUnifiedDisplay(data.body);
  const allImageUrls = allAtts.filter((a) => a.type === "image").map((a) => a.url);
  function openLightbox(url: string) {
    const idx = allImageUrls.indexOf(url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  }

  const timestamp = formatTimeAgo(data.committedAt ?? data._creationTime);

  if (editing) {
    return (
      <DetailLayout>
        <div className="feed-in mb-8 text-[13px] opacity-0">
          <Link
            to={`/commitment/${data.commitmentId}`}
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            &larr; {data.commitment?.text ?? "commitment"}
          </Link>
        </div>
        <CreatePostForm
          commitmentId={data.commitmentId}
          editEntry={{
            id: data._id,
            body: data.body,
            attachments: data.resolvedAttachments,
          }}
          onClose={() => setEditing(false)}
        />
      </DetailLayout>
    );
  }

  const commentData =
    comments === undefined
      ? undefined
      : comments.map((c) => ({
          user: c.username,
          text: c.text,
          time: formatTimeAgo(c._creationTime),
        }));

  return (
    <DetailLayout>
      <div className="feed-in mb-8 text-[13px] opacity-0">
        <Link
          to={`/commitment/${data.commitmentId}`}
          className="text-muted-foreground no-underline hover:text-foreground"
        >
          &larr; {data.commitment?.text ?? "commitment"}
        </Link>
      </div>

      <div className="feed-in opacity-0">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          {data.author?.avatarUrl && (
            <img
              src={data.author.avatarUrl}
              alt={data.author.username}
              className="h-5 w-5 rounded-full"
            />
          )}
          {data.author && (
            <Link
              to={`/profile/${data.author.username}`}
              className="text-foreground no-underline hover:text-accent"
            >
              {data.author.username}
            </Link>
          )}
          <span className="text-[#333]">{timestamp}</span>
        </div>

        {!isUnified && (
          <h1 className="mt-1 mb-4 text-lg font-bold text-foreground-bright">{data.text}</h1>
        )}

        {cover && (
          <CoverMedia
            url={cover.url}
            type={cover.type}
            duration={cover.duration}
            widthPercent={data.body ? parseMediaWidth(data.body, cover.key) : null}
            onImageClick={openLightbox}
          />
        )}

        {detailBody && (
          <div className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            <MarkdownBody
              content={detailBody}
              attachments={data.resolvedAttachments}
              onImageClick={openLightbox}
            />
          </div>
        )}

        {remainingAtts.length > 0 && (
          <AttachmentGrid attachments={remainingAtts} onImageClick={openLightbox} />
        )}

        {data.isOwn && (
          <div className="mt-4 flex items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[#333] transition-colors hover:text-muted-foreground"
              aria-label="Edit post"
            >
              <Pencil size={10} />
              <span>edit</span>
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await removePost({ entryId: data._id });
                      void navigate(`/commitment/${data.commitmentId}`);
                    } catch (err) {
                      console.error("Failed to delete post:", err);
                      setIsDeleting(false);
                      setConfirmDelete(false);
                    }
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
                className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[#333] transition-colors hover:text-destructive"
                aria-label="Delete post"
              >
                <Trash2 size={10} />
                <span>delete</span>
              </button>
            )}
          </div>
        )}

        <hr className="my-6 border-border" />
        <div className="text-[11px] text-muted-foreground">
          {data.commentCount} {data.commentCount === 1 ? "comment" : "comments"}
        </div>
        {commentData === undefined ? (
          <div className="mt-3 text-[11px] text-muted-foreground">loading comments...</div>
        ) : commentData.length > 0 ? (
          <div className="mt-2">
            <CommentThread comments={commentData} />
          </div>
        ) : (
          <div className="mt-3 border-l-2 border-border-strong px-3.5 py-1.5">
            <CommentInput />
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={allImageUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </DetailLayout>
  );
}
