import { Link } from "react-router";
import type { Commitment } from "@/types";
import { CommitmentMeta } from "./CommitmentMeta";
import { DevlogTimeline } from "./DevlogTimeline";

export function CommitCard({ item, preview }: { item: Commitment; preview?: boolean }) {
  return (
    <div>
      <CommitmentMeta
        username={item.user}
        repo={item.repo || undefined}
        isPrivate={item.isPrivate}
        activity={item.activity}
        statusLabel={
          item.status === "shipped" ? (
            <span className="text-shipped">shipped in {item.shippedIn}</span>
          ) : item.shippedAt ? (
            <span>
              <span className="text-shipped">shipped</span>
              <span className="text-muted-foreground">
                {" · "}day <span className="text-accent">{item.day}</span>
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              day <span className="text-accent">{item.day}</span>
            </span>
          )
        }
      />

      {preview ? (
        <div className="mt-1 mb-1 text-sm font-medium text-foreground">{item.text}</div>
      ) : (
        <Link
          to={`/commitment/${item.id}`}
          className="mt-1 mb-1 block text-sm font-medium text-foreground no-underline transition-colors hover:text-foreground-bright"
        >
          {item.text}
        </Link>
      )}

      {item.devlog.length > 0 && (
        <>
          <DevlogTimeline
            entries={item.devlog}
            commitmentId={item.id}
            repo={item.repo || undefined}
            isPrivate={item.isPrivate}
            showMessages={item.showMessages}
            showHashes={item.showHashes}
            showBranches={item.showBranches}
            status={item.status}
          />
          {!preview && item.hasMore && (
            <Link
              to={`/commitment/${item.id}`}
              className="mt-1 block pl-6 font-mono text-[11px] text-muted-foreground no-underline transition-colors hover:text-foreground"
            >
              view all
            </Link>
          )}
        </>
      )}
    </div>
  );
}
