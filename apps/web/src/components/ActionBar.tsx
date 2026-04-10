import { useState } from "react";
import { CommentIcon, ExtIcon, RespectIcon, RespectIconFilled } from "./Icons";

export function ActionBar({
  comments,
  respects,
  status,
  shipUrl,
  onCommentClick,
}: {
  comments: number;
  respects: number;
  status: "building" | "shipped";
  shipUrl?: string;
  onCommentClick?: () => void;
}) {
  const [respected, setRespected] = useState(false);
  const [count, setCount] = useState(respects);
  const [pulsing, setPulsing] = useState(false);

  function handleRespect() {
    if (respected) return;
    setRespected(true);
    setCount((c) => c + 1);
    setPulsing(true);
    setTimeout(() => setPulsing(false), 300);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onCommentClick}
        aria-label={`${comments} comments`}
        className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <CommentIcon size={11} color="currentColor" />
        {comments}
      </button>

      {status === "shipped" && (
        <button
          onClick={handleRespect}
          aria-label={respected ? `Respected — ${count} total` : `Give respect — ${count} total`}
          aria-pressed={respected}
          className={`flex cursor-pointer items-center gap-1.5 border-none bg-transparent font-mono text-[11px] transition-colors ${
            respected ? "text-shipped" : "text-muted-foreground hover:text-shipped"
          } ${pulsing ? "respect-pulse" : ""}`}
        >
          {respected ? (
            <RespectIconFilled size={11} color="currentColor" />
          ) : (
            <RespectIcon size={11} color="currentColor" />
          )}
          {count} respect
        </button>
      )}

      {status === "shipped" && shipUrl && (
        <a
          href={shipUrl.startsWith("http") ? shipUrl : `https://${shipUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex shrink-0 items-center gap-1 truncate text-[11px] text-shipped transition-colors hover:text-shipped/80"
        >
          {shipUrl} <ExtIcon size={10} color="currentColor" />
        </a>
      )}
    </div>
  );
}
