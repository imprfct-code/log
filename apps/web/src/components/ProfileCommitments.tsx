import { useState } from "react";
import { Link } from "react-router";
import type { Id } from "@convex/_generated/dataModel";
import { GhIcon, CommentIcon, RespectIcon } from "./Icons";
import { ActivitySparkline } from "./ActivitySparkline";
import { cn } from "@/lib/utils";

/** status "shipped" is displayed as "released" in the UI (see TABS and ProfileScreen mapping) */
interface ProfileCommitment {
  _id: Id<"commitments">;
  text: string;
  repo?: string;
  status: "building" | "shipped";
  day?: number;
  shippedIn?: string;
  shipUrl?: string;
  respectCount: number;
  commentCount: number;
  activity: number[];
  lastEntryPreview?: string;
}

const TABS = ["all", "building", "released"] as const;

export function ProfileCommitments({
  all,
  building,
  released,
}: {
  all: ProfileCommitment[];
  building: ProfileCommitment[];
  released: ProfileCommitment[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");

  const filtered = tab === "all" ? all : tab === "building" ? building : released;

  return (
    <div>
      <div className="flex gap-4 border-b border-border pb-px" role="tablist" aria-label="Filter">
        {TABS.map((t) => {
          const count =
            t === "all" ? all.length : t === "building" ? building.length : released.length;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="cursor-pointer bg-transparent pb-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors"
            >
              <span
                className={cn(
                  "relative pb-2.5 transition-colors",
                  tab === t
                    ? "text-foreground-bright after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </span>
              <span
                className={cn(
                  "ml-1.5 tabular-nums transition-colors",
                  tab === t ? "text-muted-foreground" : "text-muted-foreground/50",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[12px] text-muted-foreground">nothing here</div>
        ) : (
          filtered.map((item) => (
            <Link
              key={item._id}
              to={`/commitment/${item._id}`}
              className="flex items-center gap-4 border-b border-border py-4 no-underline transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="flex-1 truncate text-[14px] font-semibold text-foreground-bright">
                    {item.text}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 whitespace-nowrap text-[11px]",
                      item.status === "shipped" ? "text-release" : "text-accent",
                    )}
                  >
                    {item.status === "shipped"
                      ? `released in ${item.shippedIn ?? "unknown"}`
                      : `building for ${item.day ?? 0} ${(item.day ?? 0) === 1 ? "day" : "days"}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {item.repo && (
                    <span className="flex items-center gap-1">
                      <GhIcon size={10} color="#444" /> {item.repo}
                    </span>
                  )}
                  {item.status === "building" && item.lastEntryPreview && (
                    <span className="min-w-0 flex-1 truncate italic text-muted-foreground/60">
                      {item.lastEntryPreview}
                    </span>
                  )}
                  {item.commentCount > 0 && (
                    <span className="flex items-center gap-0.5">
                      <CommentIcon size={9} color="#666" /> {item.commentCount}
                    </span>
                  )}
                  {item.status === "shipped" && item.respectCount > 0 && (
                    <span className="flex items-center gap-0.5 text-release">
                      <RespectIcon size={9} color="currentColor" /> {item.respectCount}
                    </span>
                  )}
                </div>
              </div>
              <ActivitySparkline activity={item.activity} className="shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
