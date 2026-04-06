import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["all", "building", "shipped"] as const;
type Tab = (typeof TABS)[number];

export function FeedScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

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

        <div className="py-16 text-center text-sm text-muted-foreground">
          {search ? "nothing matches your search." : "no commitments yet. be the first."}
        </div>
      </div>
    </div>
  );
}
