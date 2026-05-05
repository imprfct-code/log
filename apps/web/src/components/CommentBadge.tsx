import { CommentIcon } from "./Icons";
import { cn } from "@/lib/utils";

export function CommentBadge({ count, onClick }: { count: number; onClick?: () => void }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${count} comments — toggle comment input`}
        className={cn(
          "flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent text-[11px] transition-colors",
          count > 0
            ? "text-muted-foreground hover:text-foreground"
            : "text-[#333] hover:text-muted-foreground",
        )}
      >
        <CommentIcon size={10} color="currentColor" />
        {count > 0 && count}
      </button>
    );
  }

  if (count === 0) return null;

  return (
    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
      <CommentIcon size={10} color="#666" />
      {count}
    </span>
  );
}
