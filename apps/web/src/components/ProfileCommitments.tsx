import { useState } from "react";
import { Link } from "react-router";
import type { Commitment } from "@/types";
import { GhIcon, CommentIcon, RespectIcon } from "./Icons";
import { ActivitySparkline } from "./ActivitySparkline";
import { cn } from "@/lib/utils";

const TABS = ["all", "building", "shipped"] as const;

export function ProfileCommitments({
  all,
  building,
  shipped,
}: {
  all: Commitment[];
  building: Commitment[];
  shipped: Commitment[];
}) {
  const [tab, setTab] = useState("all");

  const filtered = tab === "all" ? all : tab === "building" ? building : shipped;

  return (
    <div>
      <div className="flex gap-4 border-b border-border pb-px" role="tablist" aria-label="Filter">
        {TABS.map((t) => {
          const count =
            t === "all" ? all.length : t === "building" ? building.length : shipped.length;
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
              key={item.id}
              to={`/commitment/${item.id}`}
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
                      item.status === "shipped" ? "text-shipped" : "text-accent",
                    )}
                  >
                    {item.status === "shipped" ? `shipped in ${item.shippedIn}` : `day ${item.day}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GhIcon size={10} color="#444" /> {item.repo}
                  </span>
                  <span className="text-[#333]">&middot;</span>
                  <span>{item.devlog.length} entries</span>
                  {item.comments > 0 && (
                    <>
                      <span className="text-[#333]">&middot;</span>
                      <span className="flex items-center gap-0.5">
                        <CommentIcon size={9} color="#666" /> {item.comments}
                      </span>
                    </>
                  )}
                  {item.status === "shipped" && item.respects > 0 && (
                    <>
                      <span className="text-[#333]">&middot;</span>
                      <span className="flex items-center gap-0.5 text-shipped">
                        <RespectIcon size={9} color="currentColor" /> {item.respects}
                      </span>
                    </>
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
