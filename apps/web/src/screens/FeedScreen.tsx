import { useState, useRef, useEffect, useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Search, Loader2 } from "lucide-react";
import { FeedSkeleton } from "@/components/FeedSkeleton";
import type { Id } from "@convex/_generated/dataModel";
import { CommitCard } from "@/components/CommitCard";
import { daysSince, formatShippedIn, formatTimeAgo } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import type { Commitment, DevlogEntry } from "@/types";

const TABS = ["all", "building", "released"] as const;
type Tab = (typeof TABS)[number];

interface RawDevlogEntry {
  _id: Id<"devlogEntries">;
  type: "commit" | "post" | "git_commit" | "ship";
  text: string;
  body?: string;
  hash?: string;
  gitAuthor?: string;
  gitUrl?: string;
  gitBranch?: string;
  committedAt?: number;
  shipNote?: string;
  isMilestone?: boolean;
  commentCount: number;
  commentData: Array<{
    _id: Id<"comments">;
    userId: Id<"users">;
    username: string;
    avatarUrl?: string;
    text: string;
    createdAt: number;
    attachments?: Array<{
      url: string;
      key: string;
      type: "image" | "video";
      filename: string;
      inline: boolean;
      cover?: boolean;
      duration?: number;
    }>;
  }>;
  _creationTime: number;
  resolvedAttachments?: Array<{
    url: string;
    key: string;
    type: "image" | "video";
    filename: string;
    inline: boolean;
    cover?: boolean;
    duration?: number;
  }>;
}

interface RawFeedItem {
  _id: Id<"commitments">;
  text: string;
  repo?: string;
  isPrivate?: boolean;
  status: "building" | "shipped";
  shipNote?: string;
  initialSyncStatus?: "syncing" | "ready";
  activity: number[];
  commentCount: number;
  respectCount: number;
  _creationTime: number;
  firstEntryAt?: number;
  showMessages: boolean;
  showHashes: boolean;
  showBranches: boolean;
  user: {
    username: string;
    avatarUrl?: string;
  } | null;
  shipUrl?: string;
  shippedAt?: number;
  recentEntries?: RawDevlogEntry[];
  hasMore?: boolean;
}

function toDevlogEntry(entry: RawDevlogEntry): DevlogEntry {
  return {
    id: entry._id,
    type: entry.type,
    text: entry.text,
    body: entry.body,
    attachments: entry.resolvedAttachments,
    time: formatTimeAgo(entry.committedAt ?? entry._creationTime),
    hash: entry.hash,
    gitAuthor: entry.gitAuthor,
    gitUrl: entry.gitUrl,
    gitBranch: entry.gitBranch,
    shipNote: entry.shipNote,
    isMilestone: entry.isMilestone,
    comments: entry.commentCount,
    commentData: entry.commentData.map((c) => ({
      _id: c._id,
      userId: c.userId,
      user: c.username,
      avatar: c.avatarUrl,
      text: c.text,
      time: formatTimeAgo(c.createdAt),
      attachments: c.attachments,
    })),
  };
}

function toCommitment(item: RawFeedItem): Commitment {
  return {
    id: item._id,
    user: item.user?.username ?? "unknown",
    avatar: item.user?.avatarUrl ?? "",
    text: item.text,
    repo: item.repo ?? "",
    isPrivate: item.isPrivate,
    showMessages: item.showMessages,
    showHashes: item.showHashes,
    showBranches: item.showBranches,
    day: daysSince(item.firstEntryAt ?? item._creationTime),
    comments: item.commentCount,
    devlog: (item.recentEntries ?? []).map((e) => toDevlogEntry(e)),
    respects: item.respectCount,
    status: item.status,
    shipUrl: item.shipUrl,
    shipNote: item.shipNote,
    shippedAt: item.shippedAt,
    shippedIn: item.shippedAt
      ? formatShippedIn(item.shippedAt, item.firstEntryAt ?? item._creationTime)
      : undefined,
    activity: item.activity,
    hasMore: item.hasMore,
  };
}

export function FeedScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const statusArg =
    activeTab === "all" ? undefined : activeTab === "released" ? "shipped" : activeTab;

  const {
    results: feedResults,
    status: loadStatus,
    loadMore,
  } = usePaginatedQuery(
    api.commitments.listFeed,
    debouncedSearch ? "skip" : { status: statusArg },
    { initialNumItems: 15 },
  );

  const searchResults = useQuery(
    api.commitments.search,
    debouncedSearch ? { query: debouncedSearch, status: statusArg } : "skip",
  );

  const isSearching = !!debouncedSearch;
  const items: RawFeedItem[] = isSearching ? (searchResults ?? []) : feedResults;
  const commitments = useMemo(() => items.map(toCommitment), [items]);
  const isLoading = isSearching ? searchResults === undefined : loadStatus === "LoadingFirstPage";

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

        {isLoading ? (
          <FeedSkeleton />
        ) : commitments.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {search ? "nothing matches your search." : "no commitments yet. be the first."}
          </div>
        ) : (
          <div className="space-y-6">
            {commitments.map((item) => (
              <div key={item.id} className="feed-in border-b border-border pb-5 opacity-0">
                <CommitCard item={item} />
              </div>
            ))}

            {!isSearching && loadStatus === "CanLoadMore" && (
              <button
                type="button"
                onClick={() => loadMore(15)}
                className="w-full cursor-pointer border-none bg-transparent py-3 font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                load more
              </button>
            )}

            {!isSearching && loadStatus === "LoadingMore" && (
              <div className="flex items-center justify-center py-3">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
