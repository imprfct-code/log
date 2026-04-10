import type { ReactNode } from "react";
import { Link } from "react-router";
import { Lock } from "lucide-react";
import { canAccessExternalLink } from "@/lib/privacy";
import { GhIcon } from "./Icons";
import { ActivitySparkline } from "./ActivitySparkline";

export function CommitmentMeta({
  username,
  repo,
  repoHref,
  isPrivate,
  authorLinks = false,
  activity,
  statusLabel,
  connectSlot,
}: {
  username: string;
  repo?: string;
  repoHref?: string;
  isPrivate?: boolean;
  authorLinks?: boolean;
  activity?: number[];
  statusLabel?: ReactNode;
  connectSlot?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
      <Link
        to={`/profile/${username}`}
        className="font-semibold text-foreground-bright no-underline hover:underline"
      >
        {username}
      </Link>

      {repo ? (
        <>
          <span className="text-[#333]">/</span>
          {canAccessExternalLink(isPrivate, authorLinks) && repoHref ? (
            <a
              href={repoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground no-underline transition-colors hover:text-foreground"
            >
              <GhIcon size={11} />
              {repo}
            </a>
          ) : (
            <span className="flex items-center gap-1 truncate text-muted-foreground">
              {isPrivate && <Lock size={11} />}
              <GhIcon size={11} color="#666" />
              {repo}
            </span>
          )}
        </>
      ) : (
        connectSlot && (
          <>
            <span className="text-[#333]">/</span>
            {connectSlot}
          </>
        )
      )}

      {statusLabel && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {activity && <ActivitySparkline activity={activity} compact />}
          <span className="text-[11px]">{statusLabel}</span>
        </div>
      )}
    </div>
  );
}
