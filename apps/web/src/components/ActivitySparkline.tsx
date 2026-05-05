import { cn } from "@/lib/utils";
import { utcWeekday } from "@/lib/dates";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function ActivitySparkline({
  activity,
  compact,
  className,
}: {
  activity: number[];
  compact?: boolean;
  className?: string;
}) {
  const today = utcWeekday();
  const max = Math.max(...activity, 1);

  if (compact) {
    return (
      <div
        className={cn("flex items-end gap-[4px]", className)}
        role="img"
        aria-label={`Activity: ${activity.filter((v) => v > 0).length} of 7 days active`}
      >
        {activity.map((v, i) => (
          <div key={i} className="group relative flex flex-col items-center">
            <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 scale-75 opacity-0 transition duration-150 ease-out group-hover:scale-100 group-hover:opacity-100">
              <span className="text-[9px] tabular-nums text-foreground-bright">{v}</span>
            </div>
            <div
              className={cn(
                "size-[7px] rounded-full",
                i > today
                  ? "bg-muted-foreground/15"
                  : v > 0
                    ? "bg-accent"
                    : "bg-muted-foreground/25",
              )}
            />
            <span
              className={cn(
                "mt-[2px] text-[7px] leading-none",
                i === today ? "text-accent/70" : "text-muted-foreground/30",
              )}
            >
              {WEEKDAYS[i]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-end gap-[3px]", className)}
      role="img"
      aria-label={`Activity: ${activity.filter((v) => v > 0).length} of 7 days active`}
    >
      {activity.map((v, i) => (
        <div key={i} className="group relative flex flex-col items-center">
          <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 scale-75 opacity-0 transition duration-150 ease-out group-hover:scale-100 group-hover:opacity-100">
            <span className="text-[10px] tabular-nums text-foreground-bright">{v}</span>
          </div>
          <div
            className={cn(
              "w-[5px] rounded-[1px]",
              i > today ? "bg-muted-foreground/15" : v > 0 ? "bg-accent" : "bg-muted-foreground/25",
            )}
            style={{ height: `${v > 0 ? Math.max(4, Math.round((v / max) * 24)) : 3}px` }}
          />
          <span
            className={cn(
              "mt-[3px] text-[8px] leading-none",
              i === today ? "text-accent/70" : "text-muted-foreground/30",
            )}
          >
            {WEEKDAYS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
