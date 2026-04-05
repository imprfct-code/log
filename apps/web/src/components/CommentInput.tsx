export function CommentInput({ autoFocus }: { autoFocus?: boolean }) {
  return (
    <input
      type="text"
      placeholder="write a comment..."
      autoFocus={autoFocus}
      aria-label="Write a comment"
      className="w-full border-none bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-[#444]"
    />
  );
}
