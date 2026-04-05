import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

type HeatmapCell = {
  commits: number;
  posts: number;
  shipped: boolean;
  total: number;
  level: number;
};

function generateHeatmap(): HeatmapCell[][] {
  let seed = 42;
  function next() {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }
  const shipDays = new Set([`${38}-${3}`, `${45}-${5}`]);

  return Array.from({ length: 52 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const r = next();
      const boost = wi / 52;
      const isShip = shipDays.has(`${wi}-${di}`);

      if (isShip) {
        return { commits: 1, posts: 1, shipped: true, total: 2, level: 4 };
      }

      let commits = 0;
      let posts = 0;
      if (r >= 0.35 - boost * 0.15) {
        commits = r < 0.7 ? Math.ceil(next() * 3) : Math.ceil(next() * 5);
        posts = next() > 0.7 ? 1 : 0;
      }
      const total = commits + posts;
      const level = total === 0 ? 0 : total <= 1 ? 1 : total <= 2 ? 2 : total <= 4 ? 3 : 4;
      return { commits, posts, shipped: false, total, level };
    }),
  );
}

const HEATMAP = generateHeatmap();
const TOTAL_CONTRIBUTIONS = HEATMAP.flat().reduce((sum, c) => sum + c.total, 0);

const LEVEL_COLORS = [
  "bg-[#111111]",
  "bg-accent/20",
  "bg-accent/35",
  "bg-accent/55",
  "bg-accent/80",
];

const SHIP_COLORS = [
  "bg-[#161616]",
  "bg-shipped/20",
  "bg-shipped/35",
  "bg-shipped/55",
  "bg-shipped/80",
];

function cellTooltip(cell: HeatmapCell): string {
  if (cell.total === 0) return "No activity";
  const parts: string[] = [];
  if (cell.commits > 0) parts.push(`${cell.commits} commit${cell.commits > 1 ? "s" : ""}`);
  if (cell.posts > 0) parts.push(`${cell.posts} post${cell.posts > 1 ? "s" : ""}`);
  if (cell.shipped) parts.push("shipped!");
  return parts.join(", ");
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

export function ProfileHeatmap() {
  const heatmap = useHeatmapLens();

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">
          {TOTAL_CONTRIBUTIONS} contributions in the last year
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
            <div className="h-[8px] w-[8px] bg-shipped/80" />
            <span>ship</span>
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
          {HEATMAP.map((week, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={di}
                  data-hw={`${wi},${di}`}
                  data-label={cell.total > 0 ? cellTooltip(cell) : "nothing here"}
                  className={cn(
                    "aspect-square w-full heatmap-cell",
                    cell.shipped ? SHIP_COLORS[cell.level] : LEVEL_COLORS[cell.level],
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
    </div>
  );
}
