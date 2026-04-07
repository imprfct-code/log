import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
  const data = useQuery(api.commitments.getById, commitmentId ? { id: commitmentId } : "skip");
  const entries = useQuery(api.devlog.listByCommitment, commitmentId ? { commitmentId } : "skip");
  const [connectingRepo, setConnectingRepo] = useState(false);

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

  const { user, ...commitment } = data;
  const isAuthor = me?._id === commitment.userId;
  const canConnect = isAuthor && !commitment.repo && commitment.status === "building";
  const day = daysSince(commitment._creationTime);

  const devlog: DevlogEntryType[] = entries.map((e) => ({
    type: e.type,
    text: e.text,
    body: e.body,
    time: formatTimeAgo(e.committedAt ?? e._creationTime),
    hash: e.hash,
    gitAuthor: e.gitAuthor,
    gitUrl: e.gitUrl,
    comments: e.commentCount,
  }));

  return (
    <DetailLayout>
      <div className="feed-in opacity-0">
        <CommitmentMeta
          username={user?.username ?? "unknown"}
          repo={commitment.repo}
          repoHref={commitment.repo ? `https://github.com/${commitment.repo}` : undefined}
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
        </div>
      </div>

      {devlog.length > 0 ? (
        <div className="feed-in opacity-0" style={{ animationDelay: "60ms" }}>
          <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>devlog</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <DevlogTimeline
            entries={devlog}
            commitmentId={commitment._id}
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
