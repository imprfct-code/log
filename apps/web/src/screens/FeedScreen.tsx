import { useState, useMemo, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { commitments } from "@/data/mock";
import type { Commitment } from "@/data/mock";
import { CommitCard } from "@/components/CommitCard";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import { cn } from "@/lib/utils";

const TABS = ["all", "building", "shipped"] as const;
type Tab = (typeof TABS)[number];

const ITEMS_PER_PAGE = 4;

function getDayLabel(daysAgo: number): string {
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  return "last week";
}

function groupByDay(items: Commitment[]): [string, Commitment[]][] {
  const groups: [string, Commitment[]][] = [];
  let currentLabel = "";

  for (const item of items) {
    const label = getDayLabel(item.daysAgo);
    if (label !== currentLabel) {
      groups.push([label, [item]]);
      currentLabel = label;
    } else {
      groups[groups.length - 1][1].push(item);
    }
  }

  return groups;
}

export function FeedScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delay = 200 + Math.random() * 1100;
    const timer = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return commitments
      .filter((c) => {
        if (activeTab !== "all" && c.status !== activeTab) return false;
        if (!query) return true;
        return (
          c.user.toLowerCase().includes(query) ||
          c.repo.toLowerCase().includes(query) ||
          c.text.toLowerCase().includes(query) ||
          c.devlog.some((e) => e.text.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => a.daysAgo - b.daysAgo);
  }, [activeTab, search]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeTab, search]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + ITEMS_PER_PAGE, filtered.length));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, filtered.length, visibleCount]);

  const visible = filtered.slice(0, visibleCount);
  const grouped = groupByDay(visible);
  const hasMore = visibleCount < filtered.length;

  let cardIndex = 0;

  return (
    <div className="relative min-h-screen">
      <div className="relative mx-auto max-w-[720px] px-4 py-6 sm:px-12 sm:py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3">
          <div className="flex items-baseline gap-5">
            <h1 className="text-lg font-bold text-foreground-bright">feed</h1>
            <div className="flex" role="tablist" aria-label="Filter commitments">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "cursor-pointer border-b border-transparent bg-transparent px-2 pb-0.5 font-mono text-[13px] transition-colors",
                    activeTab === tab
                      ? "border-accent text-foreground-bright"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search..."
              aria-label="Search commitments"
              className="h-8 w-32 rounded-md border border-border bg-card/50 pl-8 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:ring-1 focus:ring-border-strong focus:outline-none sm:w-48"
            />
          </div>
        </div>

        {loading ? (
          <FeedSkeleton />
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-4">
            {grouped.map(([label, items]) => (
              <div key={label}>
                <div className="mb-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{label}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex flex-col gap-8">
                  {items.map((item) => {
                    const idx = cardIndex++;
                    return (
                      <div
                        key={item.id}
                        className="feed-in opacity-0"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <CommitCard item={item} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div ref={sentinelRef} className="py-6 text-center text-[11px] text-muted-foreground">
                loading...
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {search ? "nothing matches your search." : "no commitments yet. be the first."}
          </div>
        )}
      </div>
    </div>
  );
}
