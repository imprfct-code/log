import type { DevlogEntry as DevlogEntryType } from "@/types";
import { ExtIcon } from "./Icons";
import { CommentBadge } from "./CommentBadge";

/** Display a ship or release entry in the devlog timeline. */
export function ShipEntry({
  entry,
  onCommentClick,
}: {
  entry: DevlogEntryType;
  onCommentClick?: () => void;
}) {
  const url = entry.body;
  const href = url ? (url.startsWith("http") ? url : `https://${url}`) : undefined;
  const label = entry.isMilestone ? "shipped" : "released";

  return (
    <div className="relative py-2.5 pl-6">
      <span className="absolute left-0 top-4 h-[7px] w-[7px] -translate-x-[4px] rounded-full border border-release bg-release" />

      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] sm:flex-nowrap">
        <span className="shrink-0 text-release">{label}</span>
        {href && (
          <>
            <span className="shrink-0 text-[#333]">check it out:</span>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-release transition-colors hover:text-release/80"
            >
              {url}
              <span className="ml-1 inline-flex shrink-0 align-middle">
                <ExtIcon size={10} color="currentColor" />
              </span>
            </a>
          </>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <CommentBadge count={entry.comments} onClick={onCommentClick} />
          <span className="text-[#333]">{entry.time}</span>
        </span>
      </div>

      {entry.shipNote && (
        <p className="mt-1 text-[11px] italic text-muted-foreground">
          &ldquo;{entry.shipNote}&rdquo;
        </p>
      )}
    </div>
  );
}
