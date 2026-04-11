import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Pencil, Trash2 } from "lucide-react";
import type { Comment } from "@/types";
import { CommentInput } from "./CommentInput";
import { AttachmentGrid } from "./AttachmentGrid";

export function CommentThread({
  comments,
  commitmentId,
  devlogEntryId,
}: {
  comments: Comment[];
  commitmentId: Id<"commitments">;
  devlogEntryId?: Id<"devlogEntries">;
}) {
  const me = useQuery(api.users.getMe);
  const removeComment = useMutation(api.comments.remove);

  const [editingId, setEditingId] = useState<Id<"comments"> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"comments"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(id: Id<"comments">) {
    setIsDeleting(true);
    try {
      await removeComment({ id });
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
    setIsDeleting(false);
  }

  return (
    <div className="mt-3 border-l-2 border-border-strong px-3.5 pb-1 pt-2">
      {comments.map((comment) => {
        const isOwn = !!me && comment.userId === me._id;
        const isEditing = editingId === comment._id;
        const isConfirmingDelete = confirmDeleteId === comment._id;

        return (
          <div key={comment._id} className="group/comment mt-1.5 first:mt-0">
            <div className="flex items-center gap-2">
              {comment.avatar && (
                <img src={comment.avatar} alt={comment.user} className="h-4 w-4 rounded-full" />
              )}
              <Link
                to={`/profile/${comment.user}`}
                className="text-xs font-semibold text-foreground no-underline hover:text-accent"
              >
                {comment.user}
              </Link>
              <span className="text-[11px] text-[#333]">{comment.time}</span>

              {isOwn && !isEditing && (
                <div className="flex items-center gap-2 text-[11px] opacity-0 transition-opacity group-hover/comment:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(comment._id);
                      setConfirmDeleteId(null);
                    }}
                    className="flex cursor-pointer items-center border-none bg-transparent text-[#333] transition-colors hover:text-muted-foreground"
                    aria-label="Edit comment"
                  >
                    <Pencil size={10} />
                  </button>
                  {isConfirmingDelete ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(comment._id)}
                        className="cursor-pointer border-none bg-transparent text-[11px] text-destructive transition-colors hover:text-destructive/80 disabled:pointer-events-none disabled:opacity-40"
                      >
                        {isDeleting ? "deleting..." : "confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="cursor-pointer border-none bg-transparent text-[11px] text-[#333] transition-colors hover:text-muted-foreground"
                      >
                        cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(comment._id)}
                      className="flex cursor-pointer items-center border-none bg-transparent text-[#333] transition-colors hover:text-destructive"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-1">
                <CommentInput
                  commitmentId={commitmentId}
                  devlogEntryId={devlogEntryId}
                  edit={{
                    id: comment._id,
                    text: comment.text,
                    attachments: comment.attachments,
                  }}
                  onEditDone={() => setEditingId(null)}
                />
              </div>
            ) : (
              <>
                {comment.text && (
                  <div className="text-[13px] text-muted-foreground">{comment.text}</div>
                )}
                {comment.attachments && comment.attachments.length > 0 && (
                  <AttachmentGrid attachments={comment.attachments} />
                )}
              </>
            )}
          </div>
        );
      })}
      <div className={comments.length > 0 ? "mt-2 border-t border-border pt-1.5" : ""}>
        <CommentInput commitmentId={commitmentId} devlogEntryId={devlogEntryId} />
      </div>
    </div>
  );
}
