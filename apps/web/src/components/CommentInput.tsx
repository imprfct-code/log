import { useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function CommentInput({
  commitmentId,
  devlogEntryId,
  autoFocus,
}: {
  commitmentId: Id<"commitments">;
  devlogEntryId?: Id<"devlogEntries">;
  autoFocus?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const createComment = useMutation(api.comments.create);
  const [text, setText] = useState("");

  if (!isAuthenticated) return null;

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    try {
      await createComment({ commitmentId, devlogEntryId, text: trimmed });
    } catch (e) {
      console.error("Failed to post comment:", e);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <input
      type="text"
      placeholder="write a comment..."
      autoFocus={autoFocus}
      aria-label="Write a comment"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      className="w-full border-none bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-[#444]"
    />
  );
}
