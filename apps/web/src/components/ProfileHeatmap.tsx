import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

type HeatmapDay = {
  date: string;
  commits: number;
  posts: number;
  shipped: boolean;
};

type HeatmapCell = {
  commits: number;
  posts: number;
  shipped: boolean;
  total: number;
  level: number;
  isPadding?: boolean;
};

const LEVEL_COLORS = [
  "bg-[#111111]",
  "bg-accent/20",
  "bg-accent/35",
  "bg-accent/55",
  "bg-accent/80",
];

const RELEASE_COLORS = [
  "bg-[#161616]",
  "bg-release/20",
  "bg-release/35",
  "bg-release/55",
  "bg-release/80",
];

function cellTooltip(cell: HeatmapCell): string {
  if (cell.total === 0 && !cell.shipped) return "No activity";
  const parts: string[] = [];
  if (cell.shipped) parts.push("release");
  if (cell.commits > 0) parts.push(`${cell.commits} commit${cell.commits > 1 ? "s" : ""}`);
  if (cell.posts > 0) parts.push(`${cell.posts} post${cell.posts > 1 ? "s" : ""}`);
  return parts.join(", ");
}

function buildGrid(data: HeatmapDay[]): { grid: HeatmapCell[][]; total: number } {
  if (data.length === 0) {
    return { grid: [], total: 0 };
  }

  let total = 0;
  const cells: HeatmapCell[] = data.map((d) => {
    const t = d.commits + d.posts;
    total += t;
    // Ship → max level, else normal activity level
    let level: number;
    if (d.shipped) {
      level = 4;
    } else {
      level = t === 0 ? 0 : t <= 1 ? 1 : t <= 2 ? 2 : t <= 4 ? 3 : 4;
    }
    return {
      commits: d.commits,
      posts: d.posts,
      shipped: d.shipped,
      total: t,
      level,
    };
  });

  const firstDate = new Date(data[0].date);
  const jsDay = firstDate.getUTCDay();
  const weekday = jsDay === 0 ? 6 : jsDay - 1;
  const padding: HeatmapCell = {
    commits: 0,
    posts: 0,
    shipped: false,
    total: 0,
    level: 0,
    isPadding: true,
  };
  const empty: HeatmapCell = {
    commits: 0,
    posts: 0,
    shipped: false,
    total: 0,
    level: 0,
  };
  const padded = [...Array.from<HeatmapCell>({ length: weekday }).fill(padding), ...cells];

  const grid: HeatmapCell[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7);
    while (week.length < 7) week.push(empty);
    grid.push(week);
  }

  return { grid, total };
}

function useHeatmapLens() {
  const gridRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<HTMLElement[]>([]);
  const rafRef = useRef<number>(0);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const grid = gridRef.current;
      const tip = tooltipRef.current;
      if (!grid) return;

      if (cellsRef.current.length === 0) {
        cellsRef.current = Array.from(grid.querySelectorAll<HTMLElement>("[data-hw]"));
        for (const el of cellsRef.current) {
          el.style.transition = "transform 0.1s ease-out";
        }
      }

      const target = e.target as HTMLElement;
      const hoverEl = target.dataset.hw ? target : target.closest<HTMLElement>("[data-hw]");
      if (!hoverEl) return;

      const [wi, di] = hoverEl.dataset.hw!.split(",").map(Number);
      const gridRect = grid.getBoundingClientRect();

      for (const cell of cellsRef.current) {
        const [cw, cd] = cell.dataset.hw!.split(",").map(Number);
        const dist = Math.sqrt((wi - cw) ** 2 + (di - cd) ** 2);
        let s = 1;
        if (dist === 0) s = 1.15;
        else if (dist < 1.5) s = 0.88;
        else if (dist < 2.5) s = 0.94;
        cell.style.transform = `scale(${s})`;
      }

      if (tip) {
        const label = hoverEl.dataset.label;
        if (label) {
          const rect = hoverEl.getBoundingClientRect();
          tip.textContent = label;
          tip.style.opacity = "1";
          tip.style.left = `${rect.left - gridRect.left + rect.width / 2}px`;
          tip.style.top = `${rect.top - gridRect.top - 26}px`;
        } else {
          tip.style.opacity = "0";
        }
      }
    });
  }, []);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    for (const cell of cellsRef.current) {
      cell.style.transform = "";
    }
    if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
  }, []);

  return { gridRef, tooltipRef, handleMove, handleLeave };
}

export function ProfileHeatmap({ data }: { data: HeatmapDay[] }) {
  const { grid, total } = useMemo(() => buildGrid(data), [data]);
  const heatmap = useHeatmapLens();

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">
          {total} contribution{total !== 1 ? "s" : ""} in the last year
        </span>
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span>less</span>
            {LEVEL_COLORS.map((cls, i) => (
              <div key={i} className={cn("h-[8px] w-[8px]", cls)} />
            ))}
            <span>more</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="h-[8px] w-[8px] bg-release/80" />
            <span>release</span>
          </span>
        </div>
      </div>
      <div
        ref={heatmap.gridRef}
        className="relative"
        onMouseMove={heatmap.handleMove}
        onMouseLeave={heatmap.handleLeave}
      >
        <div className="flex w-full gap-[3px]">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={di}
                  data-hw={`${wi},${di}`}
                  data-label={
                    cell.isPadding
                      ? ""
                      : cell.total > 0 || cell.shipped
                        ? cellTooltip(cell)
                        : "No activity"
                  }
                  className={cn(
                    "aspect-square w-full heatmap-cell",
                    cell.shipped ? RELEASE_COLORS[cell.level] : LEVEL_COLORS[cell.level],
                  )}
                  style={{ animationDelay: `${wi * 20}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          ref={heatmap.tooltipRef}
          className="pointer-events-none absolute z-50 -translate-x-1/2 whitespace-nowrap border border-border-strong bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-foreground-bright opacity-0 transition-opacity duration-100"
          style={{ left: 0, top: 0 }}
        />
      </div>
      {total < 20 && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
          keep building — every commit counts
        </p>
      )}
    </div>
  );
}
