import { Link } from "react-router";
import type { Commitment } from "@/data/mock";
import { GhIcon } from "./Icons";
import { ActivitySparkline } from "./ActivitySparkline";
import { DevlogTimeline } from "./DevlogTimeline";

export function CommitCard({ item, preview }: { item: Commitment; preview?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
        <Link
          to={`/profile/${item.user}`}
          className="font-semibold text-foreground-bright no-underline hover:underline"
        >
          {item.user}
        </Link>
        <span className="text-[#333]">/</span>
        <span className="flex items-center gap-1 truncate text-muted-foreground">
          <GhIcon size={11} color="#666" />
          {item.repo}
        </span>

        <ActivitySparkline activity={item.activity} className="ml-1" />

        <span className="ml-auto shrink-0 text-[11px]">
          {item.status === "shipped" ? (
            <span className="text-shipped">shipped in {item.shippedIn}</span>
          ) : (
            <span className="text-muted-foreground">
              day <span className="text-accent">{item.day}</span>
            </span>
          )}
        </span>
      </div>

      {preview ? (
        <div className="mt-1 mb-3 text-sm font-medium text-foreground">{item.text}</div>
      ) : (
        <Link
          to={`/commitment/${item.id}`}
          className="mt-1 mb-3 block text-sm font-medium text-foreground no-underline transition-colors hover:text-foreground-bright"
        >
          {item.text}
        </Link>
      )}

      {item.devlog.length > 0 && (
        <DevlogTimeline entries={item.devlog} commitmentId={item.id} status={item.status} />
      )}
    </div>
  );
}
