import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommitmentMeta } from "@/components/CommitmentMeta";
import { ConnectRepoForm } from "@/components/ConnectRepoForm";
import { DevlogTimeline } from "@/components/DevlogTimeline";
import { daysSince, formatTimeAgo } from "@/lib/formatTime";
import type { DevlogEntry as DevlogEntryType } from "@/types";

function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
      <div className="feed-in mb-8 text-[13px] opacity-0">
        <Link to="/feed" className="text-muted-foreground no-underline hover:text-foreground">
          ← feed
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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [viewAsGuest, setViewAsGuest] = useState(false);
  const data = useQuery(
    api.commitments.getById,
    commitmentId ? { id: commitmentId, viewAsGuest } : "skip",
  );
  const entries = useQuery(
    api.devlog.listByCommitment,
    commitmentId ? { commitmentId, viewAsGuest } : "skip",
  );
  const triggerSync = useAction(api.github.triggerSync);

  if (!commitmentId) {
    return (
      <DetailLayout>
        <DetailMessage text="invalid commitment id." />
      </DetailLayout>
    );
  }

  if (data === undefined || entries === undefined) {
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
  const isAuthor = me?._id === commitment.userId;
  const effectiveAuthor = isAuthor && !viewAsGuest;
  const canConnect = isAuthor && !commitment.repo && commitment.status === "building";
  const canSync =
    isAuthor && commitment.repo && !commitment.webhookId && commitment.status === "building";
  const day = daysSince(commitment._creationTime);

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

  const devlog: DevlogEntryType[] = entries.map((e) => ({
    type: e.type,
    text: e.text,
    body: e.body,
    time: formatTimeAgo(e.committedAt ?? e._creationTime),
    hash: e.hash,
    gitAuthor: e.gitAuthor,
    gitUrl: e.gitUrl,
    gitBranch: e.gitBranch,
    comments: e.commentCount,
  }));

  return (
    <DetailLayout>
      <div className="feed-in opacity-0">
        <CommitmentMeta
          username={user?.username ?? "unknown"}
          repo={commitment.repo}
          repoHref={commitment.repo ? `https://github.com/${commitment.repo}` : undefined}
          isPrivate={commitment.isPrivate}
          authorLinks={effectiveAuthor}
          activity={commitment.activity}
          statusLabel={
            commitment.status === "shipped" ? (
              <span className="text-shipped">shipped</span>
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

        <h1 className="mt-1 mb-4 text-lg font-bold text-foreground-bright">{commitment.text}</h1>

        <div className="mb-4 flex items-center gap-4 text-[11px] text-muted-foreground">
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
        </div>
      </div>

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
            limit={20}
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
    </DetailLayout>
  );
}
