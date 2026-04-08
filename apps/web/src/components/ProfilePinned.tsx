import { Link } from "react-router";
import type { Commitment } from "@/types";
import { Lock } from "lucide-react";
import { GhIcon, RespectIcon } from "./Icons";
import { ActivitySparkline } from "./ActivitySparkline";
import { GlowCard } from "./GlowCard";
import { cn } from "@/lib/utils";

export function ProfilePinned({ items }: { items: Commitment[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">pinned</div>
      <GlowCard className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/commitment/${item.id}`}
            className="glow-card block border border-border p-4 no-underline transition-colors hover:border-border-strong"
          >
            <div className="flex items-center gap-2 text-[11px]">
              <span
                className={cn(
                  "px-1.5 py-0.5 text-[10px] uppercase tracking-widest",
                  item.status === "shipped"
                    ? "bg-shipped-soft text-shipped"
                    : "bg-accent-soft text-accent",
                )}
              >
                {item.status}
              </span>
              <span className="flex items-center gap-1 truncate text-muted-foreground">
                {item.isPrivate && <Lock size={10} />}
                <GhIcon size={10} color="#666" />
                {item.repo}
              </span>
            </div>

            <div className="mt-2 text-[14px] font-semibold text-foreground-bright">{item.text}</div>

            <ActivitySparkline activity={item.activity} className="mt-2" />

            {item.devlog[0] && (
              <div className="mt-2 truncate text-[12px] text-muted-foreground">
                {item.devlog[0].type === "commit" && item.devlog[0].hash && (
                  <span className="text-accent">{item.devlog[0].hash.slice(0, 7)} </span>
                )}
                {item.devlog[0].text}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              {item.status === "shipped" ? (
                <span className="text-shipped">shipped in {item.shippedIn}</span>
              ) : (
                <span>
                  day <span className="text-accent">{item.day}</span>
                </span>
              )}
              {item.status === "shipped" ? (
                <span className="flex items-center gap-1 text-shipped">
                  <RespectIcon size={10} color="currentColor" />
                  {item.respects}
                </span>
              ) : (
                <span>{item.devlog.length} entries</span>
              )}
            </div>
          </Link>
        ))}
      </GlowCard>
    </div>
  );
}
