import { Link } from "react-router";
import type { DevlogEntry } from "@/types";
import { cn } from "@/lib/utils";

type ActivityEntry = DevlogEntry & {
  commitmentTitle: string;
  commitmentId: number;
};

export function ProfileActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div>
      <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        recent activity
      </div>
      <div className="relative border-l border-border-strong">
        {entries.map((entry, i) => (
          <div key={i} className="relative flex items-baseline gap-2.5 py-2 pl-6 text-[13px]">
            <span
              className={cn(
                "absolute left-0 top-1/2 h-[7px] w-[7px] -translate-x-[3.5px] -translate-y-1/2 rounded-full border",
                entry.type === "post"
                  ? "border-accent/50 bg-accent"
                  : "border-border-strong bg-muted",
              )}
            />

            {(entry.type === "commit" || entry.type === "git_commit") && entry.hash && (
              <span className="shrink-0 text-[11px] text-[#444]">{entry.hash.slice(0, 7)}</span>
            )}
            {entry.type === "post" && (
              <span className="shrink-0 text-[10px] uppercase tracking-widest text-accent">
                post
              </span>
            )}

            <span className="min-w-0 flex-1 truncate text-foreground">{entry.text}</span>

            <Link
              to={`/commitment/${entry.commitmentId}`}
              className="hidden shrink-0 truncate text-[11px] text-muted-foreground no-underline hover:text-foreground sm:inline"
            >
              {entry.commitmentTitle}
            </Link>

            <span className="shrink-0 text-[11px] text-[#333]">{entry.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
