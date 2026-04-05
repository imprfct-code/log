import { cn } from "@/lib/utils";

export function ActivitySparkline({
  activity,
  className,
}: {
  activity: number[];
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-end gap-[2px]", className)}
      role="img"
      aria-label={`Activity: ${activity.filter((v) => v > 0).length} of ${activity.length} days active`}
    >
      {activity.map((v, i) => (
        <div
          key={i}
          className={cn("w-[3px]", v > 0 ? "bg-accent/50" : "bg-border-strong")}
          style={{ height: `${Math.max(2, v * 3)}px` }}
        />
      ))}
    </div>
  );
}
