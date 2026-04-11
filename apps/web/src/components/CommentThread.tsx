import { Link } from "react-router";
import type { Id } from "@convex/_generated/dataModel";
import type { Comment } from "@/types";
import { CommentInput } from "./CommentInput";

export function CommentThread({
  comments,
  commitmentId,
  devlogEntryId,
}: {
  comments: Comment[];
  commitmentId: Id<"commitments">;
  devlogEntryId?: Id<"devlogEntries">;
}) {
  return (
    <div className="mt-3 border-l-2 border-border-strong px-3.5 pb-1 pt-2">
      {comments.map((comment, i) => (
        <div key={i} className={i > 0 ? "mt-1.5" : ""}>
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
          </div>
          <div className="text-[13px] text-muted-foreground">{comment.text}</div>
        </div>
      ))}
      <div className={comments.length > 0 ? "mt-2 border-t border-border pt-1.5" : ""}>
        <CommentInput commitmentId={commitmentId} devlogEntryId={devlogEntryId} />
      </div>
    </div>
  );
}
