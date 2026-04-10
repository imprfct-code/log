import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useAction, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Eye, GitBranch, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivitySparkline } from "@/components/ActivitySparkline";
import { CommitmentMeta } from "@/components/CommitmentMeta";
import { ConnectRepoForm } from "@/components/ConnectRepoForm";
import { CreatePostForm } from "@/components/CreatePostForm";
import { DevlogTimeline } from "@/components/DevlogTimeline";
import { ExtIcon } from "@/components/Icons";
import { ShipForm } from "@/components/ShipForm";
import { Button } from "@/components/ui/button";
import { daysSince, formatShippedIn, formatTimeAgo } from "@/lib/formatTime";
import type { DevlogEntry as DevlogEntryType } from "@/types";

function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
      <div className="feed-in mb-5 text-[13px] opacity-0">
        <Link to="/feed" className="text-muted-foreground no-underline hover:text-foreground">
          &larr; feed
        </Link>
      </div>
      {children}
    </div>
  );
}

function DetailMessage({ text }: { text: string }) {
  return <div className="py-16 text-center text-sm text-muted-foreground">{text}</div>;
}

export function CommitmentDetailScreen() {
  const { id } = useParams();
  // Cast unavoidable: useParams returns string, Convex requires Id<"commitments">.
  // Invalid IDs are handled server-side (query returns null).
  const commitmentId = id as Id<"commitments"> | undefined;

  const me = useQuery(api.users.getMe);
  const [connectingRepo, setConnectingRepo] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [viewAsGuest, setViewAsGuest] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const data = useQuery(
    api.commitments.getById,
    commitmentId ? { id: commitmentId, viewAsGuest } : "skip",
  );
  const {
    results: entries,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.devlog.listByCommitment,
    commitmentId ? { commitmentId, viewAsGuest } : "skip",
    { initialNumItems: 20 },
  );
  const triggerSync = useAction(api.github.triggerSync);

  const isAuthor = !!data && !!me && me._id === data.userId;
  const effectiveAuthor = isAuthor && !viewAsGuest;

  const devlog: DevlogEntryType[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e._id,
        type: e.type,
        text: e.text,
        body: e.body,
        attachments: e.resolvedAttachments,
        time: formatTimeAgo(e.committedAt ?? e._creationTime),
        hash: e.hash,
        gitAuthor: e.gitAuthor,
        gitUrl: e.gitUrl,
        gitBranch: e.gitBranch,
        comments: e.commentCount,
        isOwn: effectiveAuthor,
      })),
    [entries, effectiveAuthor],
  );

  if (!commitmentId) {
    return (
      <DetailLayout>
        <DetailMessage text="invalid commitment id." />
      </DetailLayout>
    );
  }

  if (data === undefined || paginationStatus === "LoadingFirstPage") {
    return (
      <DetailLayout>
        <DetailMessage text="loading..." />
      </DetailLayout>
    );
  }

  if (data === null) {
    return (
      <DetailLayout>
        <DetailMessage text="commitment not found." />
      </DetailLayout>
    );
  }

  const { user, showMessages, showHashes, showBranches, ...commitment } = data;
  const isSyncing = commitment.initialSyncStatus === "syncing";
  const canConnect = effectiveAuthor && !commitment.repo && commitment.status === "building";
  const canSync =
    effectiveAuthor && commitment.repo && !commitment.webhookId && commitment.status === "building";
  const canPost = effectiveAuthor && commitment.status === "building";
  const canShip = effectiveAuthor && commitment.status === "building";
  const day = daysSince(commitment.firstEntryAt ?? commitment._creationTime);

  async function handleSync() {
    if (!commitmentId || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await triggerSync({ commitmentId });
      const n = result?.newCommits ?? 0;
      setSyncResult(n > 0 ? `${n} new` : "up to date");
      setTimeout(() => setSyncResult(null), 3000);
    } catch {
      setSyncResult("failed");
      setTimeout(() => setSyncResult(null), 3000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <DetailLayout>
      <div className="feed-in opacity-0">
        <CommitmentMeta
          username={user?.username ?? "unknown"}
          repo={commitment.repo}
          repoHref={commitment.repo ? `https://github.com/${commitment.repo}` : undefined}
          isPrivate={commitment.isPrivate}
          authorLinks={effectiveAuthor}
          statusLabel={
            isSyncing ? (
              <span className="text-muted-foreground">syncing</span>
            ) : commitment.status === "shipped" ? (
              <span className="text-shipped">
                shipped in {formatShippedIn(commitment.shippedAt!, commitment._creationTime)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                day <span className="text-accent">{day}</span>
              </span>
            )
          }
          connectSlot={
            canConnect && !connectingRepo ? (
              <button
                type="button"
                onClick={() => setConnectingRepo(true)}
                className="cursor-pointer border-none bg-transparent p-0 font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                + connect repo
              </button>
            ) : undefined
          }
        />

        {connectingRepo && !commitment.repo && (
          <div className="mt-2">
            <ConnectRepoForm commitmentId={commitment._id} />
          </div>
        )}

        <div className="mt-1 mb-2 flex items-start gap-4">
          <h1 className="min-w-0 flex-1 text-lg font-bold text-foreground-bright">
            {commitment.text}
          </h1>
          {!isSyncing && (
            <ActivitySparkline activity={commitment.activity} className="shrink-0 pt-1" />
          )}
        </div>

        {!isSyncing && (
          <div className="mb-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>{commitment.commentCount} comments</span>
            <span>{commitment.respectCount} respects</span>
            {canSync && (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void handleSync()}
                className="ml-auto flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
                {syncing ? "syncing..." : (syncResult ?? "sync")}
              </button>
            )}
            {commitment.status === "shipped" && commitment.shipUrl && (
              <a
                href={
                  commitment.shipUrl.startsWith("http")
                    ? commitment.shipUrl
                    : `https://${commitment.shipUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex shrink-0 items-center gap-1 truncate text-[11px] text-shipped transition-colors hover:text-shipped/80"
              >
                {commitment.shipUrl} <ExtIcon size={10} color="currentColor" />
              </a>
            )}
          </div>
        )}

        {canShip && (
          <div className="mb-3">
            {shipping ? (
              <ShipForm commitmentId={commitment._id} />
            ) : (
              <Button variant="ship" size="sm" onClick={() => setShipping(true)}>
                ship it
              </Button>
            )}
          </div>
        )}
      </div>

      {isSyncing ? (
        <div className="feed-in space-y-2 pt-2 opacity-0" style={{ animationDelay: "30ms" }}>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="pulse-dot h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
            <span>
              synced <span className="text-accent">{commitment.syncedCount ?? 0}</span> commits
              <span className="dots-loading inline-block w-[3ch] text-left" />
            </span>
          </div>
          {commitment.syncCurrentBranch && (
            <div className="flex items-center gap-2 pl-[15px] text-[11px] text-muted-foreground/60">
              <span>checking</span>
              <span className="flex items-center gap-1 border border-border px-1 py-px text-[10px] text-[#555]">
                <GitBranch size={10} />
                {commitment.syncCurrentBranch}
              </span>
            </div>
          )}
        </div>
      ) : (
        <>
          {canPost && (
            <div className="feed-in mb-4 opacity-0" style={{ animationDelay: "30ms" }}>
              {showPostForm ? (
                <CreatePostForm
                  commitmentId={commitment._id}
                  onClose={() => setShowPostForm(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPostForm(true)}
                  className="cursor-pointer border-none bg-transparent p-0 font-mono text-[13px] text-accent transition-colors hover:text-foreground-bright"
                >
                  + add update
                </button>
              )}
            </div>
          )}

          {devlog.length > 0 ? (
            <div className="feed-in opacity-0" style={{ animationDelay: "60ms" }}>
              {isAuthor && commitment.isPrivate && (
                <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>activity</span>
                  <div className="h-px flex-1 bg-border" />
                  <button
                    type="button"
                    onClick={() => setViewAsGuest((v) => !v)}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-1.5 border px-2 py-1 font-mono text-[11px] transition-colors",
                      viewAsGuest
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-border bg-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    <Eye size={11} />
                    {viewAsGuest ? "viewing as guest" : "view as guest"}
                  </button>
                </div>
              )}
              <DevlogTimeline
                entries={devlog}
                commitmentId={commitment._id}
                repo={commitment.repo}
                isPrivate={commitment.isPrivate}
                showMessages={showMessages}
                showHashes={showHashes}
                showBranches={showBranches}
                authorLinks={effectiveAuthor}
                status={commitment.status}
                isDetailPage
                onLoadMore={
                  paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore"
                    ? () => loadMore(50)
                    : undefined
                }
              />
            </div>
          ) : (
            <div
              className="feed-in py-8 text-center text-sm text-muted-foreground opacity-0"
              style={{ animationDelay: "60ms" }}
            >
              no devlog entries yet.
            </div>
          )}
        </>
      )}
    </DetailLayout>
  );
}
