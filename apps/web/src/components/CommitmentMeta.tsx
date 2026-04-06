import type { ReactNode } from "react";
import { Link } from "react-router";
import { GhIcon } from "./Icons";
import { ActivitySparkline } from "./ActivitySparkline";

export function CommitmentMeta({
  username,
  repo,
  repoHref,
  activity,
  statusLabel,
}: {
  username: string;
  repo?: string;
  repoHref?: string;
  activity: number[];
  statusLabel: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
      <Link
        to={`/profile/${username}`}
        className="font-semibold text-foreground-bright no-underline hover:underline"
      >
        {username}
      </Link>

      {repo && (
        <>
          <span className="text-[#333]">/</span>
          {repoHref ? (
            <a
              href={repoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground no-underline hover:text-foreground"
            >
              <GhIcon size={11} color="#666" />
              {repo}
            </a>
          ) : (
            <span className="flex items-center gap-1 truncate text-muted-foreground">
              <GhIcon size={11} color="#666" />
              {repo}
            </span>
          )}
        </>
      )}

      <ActivitySparkline activity={activity} className="ml-1" />

      <span className="ml-auto shrink-0 text-[11px]">{statusLabel}</span>
    </div>
  );
}
