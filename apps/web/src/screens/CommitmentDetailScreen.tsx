import { useRef, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Eye, GitBranch, Pencil, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivitySparkline } from "@/components/ActivitySparkline";
import { BoostButton } from "@/components/BoostButton";
import { CommitmentMeta } from "@/components/CommitmentMeta";
import { ConnectRepoForm } from "@/components/ConnectRepoForm";
import { CreatePostForm } from "@/components/CreatePostForm";
import { DevlogTimeline } from "@/components/DevlogTimeline";
import { ShipModal } from "@/components/ShipModal";
import { AbandonModal } from "@/components/AbandonModal";
import { Button } from "@/components/ui/button";
import { COMMITMENT_TITLE_MAX_LENGTH } from "@convex/shared";
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
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [abandonModalOpen, setAbandonModalOpen] = useState(false);
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
  const updateText = useMutation(api.commitments.updateText);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

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
        shipNote: e.shipNote,
        isMilestone: e.isMilestone,
        comments: e.commentCount,
        commentData: e.commentData.map((c) => ({
          _id: c._id,
          userId: c.userId,
          user: c.username,
          avatar: c.avatarUrl,
          text: c.text,
          time: formatTimeAgo(c.createdAt),
          attachments: c.attachments,
        })),
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
  const canShip =
    effectiveAuthor && commitment.status === "building" && !isSyncing && entries.length > 0;
  const canAbandon = effectiveAuthor && commitment.status === "building";
  const day = daysSince(commitment.firstEntryAt ?? commitment._creationTime);

  const canEditTitle = effectiveAuthor && commitment.status === "building";

  function startEditingTitle() {
    setTitleDraft(commitment.text);
    setTitleError(null);
    setEditingTitle(true);
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  async function saveTitle() {
    if (titleSaving) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === commitment.text) {
      setEditingTitle(false);
      return;
    }
    setTitleSaving(true);
    setTitleError(null);
    try {
      await updateText({ id: commitment._id, text: trimmed });
      setEditingTitle(false);
    } catch (e) {
      setTitleError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setTitleSaving(false);
    }
  }

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
      <div className="feed-in relative z-10 opacity-0">
        <CommitmentMeta
          username={user?.username ?? "unknown"}
          repo={commitment.repo}
          repoHref={commitment.repo ? `https://github.com/${commitment.repo}` : undefined}
          isPrivate={commitment.isPrivate}
          authorLinks={effectiveAuthor}
          statusLabel={
            isSyncing ? (
              <span className="text-muted-foreground">syncing</span>
            ) : commitment.status === "abandoned" ? (
              <span className="text-muted-foreground/60">abandoned</span>
            ) : commitment.status === "shipped" && commitment.shippedAt ? (
              <span className="text-release">
                released in{" "}
                {formatShippedIn(
                  commitment.shippedAt,
                  commitment.firstEntryAt ?? commitment._creationTime,
                )}
              </span>
            ) : commitment.shippedAt ? (
              <span>
                <span className="text-release">shipped</span>
                <span className="text-muted-foreground">
                  {" · "}day <span className="text-accent">{day}</span>
                </span>
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
          {editingTitle ? (
            <div className="min-w-0 flex-1">
              <input
                ref={titleRef}
                value={titleDraft}
                onChange={(e) =>
                  setTitleDraft(e.target.value.slice(0, COMMITMENT_TITLE_MAX_LENGTH))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void saveTitle();
                  }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                maxLength={COMMITMENT_TITLE_MAX_LENGTH}
                autoComplete="off"
                className="w-full border-b border-border-strong bg-transparent text-lg font-bold text-foreground-bright outline-none focus:border-accent"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/40">
                  {titleDraft.length}/{COMMITMENT_TITLE_MAX_LENGTH}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTitle(false)}
                    className="cursor-pointer bg-transparent text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      titleSaving || !titleDraft.trim() || titleDraft.trim() === commitment.text
                    }
                    onClick={() => void saveTitle()}
                    className="cursor-pointer bg-transparent text-[11px] text-accent transition-colors hover:text-accent/80 disabled:opacity-40"
                  >
                    {titleSaving ? "saving..." : "save"}
                  </button>
                </div>
              </div>
              {titleError && <p className="mt-1 text-[11px] text-destructive">{titleError}</p>}
            </div>
          ) : (
            <div className="group flex min-w-0 flex-1 items-center">
              <h1 className="min-w-0 flex-1 text-lg font-bold text-foreground-bright">
                {commitment.text}
              </h1>
              {canEditTitle && (
                <button
                  type="button"
                  onClick={startEditingTitle}
                  aria-label="Edit commitment title"
                  className="ml-2 cursor-pointer bg-transparent p-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60 focus-visible:text-muted-foreground/60"
                >
                  <Pencil size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {!isSyncing && (
            <ActivitySparkline activity={commitment.activity} className="shrink-0 pt-1" />
          )}
        </div>

        {!isSyncing && (
          <div className="mb-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>{commitment.commentCount} comments</span>
            {commitment.status === "shipped" && (
              <BoostButton commitmentId={commitment._id} initialCount={commitment.boostCount} />
            )}
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
          </div>
        )}

        {shipModalOpen && (
          <ShipModal
            commitmentId={commitment._id}
            commitmentText={commitment.text}
            repo={commitment.repo}
            previousShipUrl={commitment.shipUrl}
            onClose={() => setShipModalOpen(false)}
          />
        )}

        {abandonModalOpen && (
          <AbandonModal
            commitmentId={commitment._id}
            commitmentText={commitment.text}
            onClose={() => setAbandonModalOpen(false)}
          />
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
            <div
              className="feed-in mb-4 flex items-center opacity-0"
              style={{ animationDelay: "30ms" }}
            >
              {showPostForm ? (
                <div className="flex-1">
                  <CreatePostForm
                    commitmentId={commitment._id}
                    onClose={() => setShowPostForm(false)}
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPostForm(true)}
                    className="cursor-pointer border-none bg-transparent p-0 font-mono text-[13px] text-accent transition-colors hover:text-foreground-bright"
                  >
                    + add update
                  </button>
                  <div className="ml-auto flex items-center gap-3">
                    {canAbandon && (
                      <button
                        type="button"
                        onClick={() => setAbandonModalOpen(true)}
                        className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                      >
                        abandon
                      </button>
                    )}
                    {canShip && (
                      <Button variant="default" size="sm" onClick={() => setShipModalOpen(true)}>
                        ship it
                      </Button>
                    )}
                  </div>
                </>
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
