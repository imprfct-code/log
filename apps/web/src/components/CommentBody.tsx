import { useState } from "react";

const CLAMP_CHARS = 280;

export function CommentBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > CLAMP_CHARS;

  return (
    <div className="text-[13px] text-muted-foreground">
      <div className={!expanded && isLong ? "line-clamp-4" : ""}>{text}</div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((isExpanded) => !isExpanded)}
          className="mt-0.5 cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] text-[#444] transition-colors hover:text-muted-foreground"
        >
          {expanded ? "show less" : "show more"}
        </button>
      )}
    </div>
  );
}
