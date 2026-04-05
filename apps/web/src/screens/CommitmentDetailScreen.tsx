import { useState } from "react";
import { Link } from "react-router";
import { commitments } from "@/data/mock";
import { GhIcon, ExtIcon, RespectIcon } from "@/components/Icons";
import { ActivitySparkline } from "@/components/ActivitySparkline";
import { CommentThread } from "@/components/CommentThread";
import { CommentInput } from "@/components/CommentInput";
import { DevlogEntry } from "@/components/DevlogEntry";
import { StatBlock } from "@/components/StatBlock";
import { GlowCard } from "@/components/GlowCard";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommitmentDetailScreen() {
  const item = commitments[0];
  const [openInputs, setOpenInputs] = useState<Set<number>>(new Set());

  const commitCount = item.devlog.filter((e) => e.type === "commit").length;
  const postCount = item.devlog.filter((e) => e.type === "post").length;
  const totalComments = item.devlog.reduce((sum, e) => sum + e.comments, 0);

  const stats = [
    { label: "day", value: String(item.day), color: "#c7787a" },
    { label: "commits", value: String(commitCount), color: "#e8e8e8" },
    { label: "posts", value: String(postCount), color: "#e8e8e8" },
    { label: "comments", value: String(totalComments), color: "#e8e8e8" },
    ...(item.status === "shipped"
      ? [{ label: "respect", value: String(item.respects), color: "#5cb870" }]
      : []),
  ];

  function toggleComment(index: number) {
    setOpenInputs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
      <nav className="feed-in opacity-0" aria-label="Breadcrumb">
        <div className="mb-8 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link to="/feed" className="text-muted-foreground no-underline hover:text-foreground">
            feed
          </Link>
          <span className="text-[#333]" aria-hidden="true">
            /
          </span>
          <Link
            to={`/profile/${item.user}`}
            className="text-foreground no-underline hover:underline"
          >
            {item.user}
          </Link>
          <span className="text-[#333]" aria-hidden="true">
            /
          </span>
          <span className="text-muted-foreground">{item.repo.split("/")[1]}</span>
        </div>
      </nav>

      <div className="feed-in opacity-0" style={{ animationDelay: "0.05s" }}>
        <div className="mb-3 flex items-center gap-3">
          <Badge variant={item.status === "shipped" ? "shipped" : "building"}>
            {item.status.toUpperCase()}
          </Badge>
          <span className="text-[13px] text-accent">
            {item.status === "shipped" ? `shipped in ${item.shippedIn}` : `day ${item.day}`}
          </span>
          <ActivitySparkline activity={item.activity} className="ml-auto" />
        </div>

        <h1 className="mt-3 mb-2 text-3xl font-extrabold leading-tight tracking-tight text-foreground-bright">
          {item.text}
        </h1>

        <div className="text-[13px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-1.5">
            <GhIcon size={12} color="#666" />
            <span className="flex cursor-pointer items-center gap-1">
              {item.repo} <ExtIcon size={10} color="#666" />
            </span>
            <span className="text-[#333]">&middot;</span>
            <span>{item.devlog.length} entries</span>
            <span className="text-[#333]">&middot;</span>
            <span>{commitCount} commits</span>
            {totalComments > 0 && (
              <>
                <span className="text-[#333]">&middot;</span>
                <span>{totalComments} comments</span>
              </>
            )}
            {item.status === "shipped" && item.respects > 0 && (
              <>
                <span className="text-[#333]">&middot;</span>
                <span className="flex items-center gap-1 text-shipped">
                  <RespectIcon size={10} color="currentColor" />
                  {item.respects}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="feed-in mt-6 opacity-0" style={{ animationDelay: "0.1s" }}>
        <StatBlock stats={stats} />
      </div>

      <div className="feed-in mt-8 opacity-0" style={{ animationDelay: "0.15s" }}>
        <GlowCard className="flex gap-2.5">
          <Link
            to={`/ship/${item.id}`}
            className={cn(buttonVariants({ variant: "default" }), "glow-card")}
          >
            Ship it
          </Link>
          <Button variant="secondary" className="glow-card">
            Add post
          </Button>
        </GlowCard>
      </div>

      <div className="feed-in mt-10 opacity-0" style={{ animationDelay: "0.2s" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          devlog
        </div>
        <div className="relative overflow-visible border-l border-border-strong">
          {item.devlog.map((entry, i) => (
            <div key={i}>
              <DevlogEntry
                entry={entry}
                commitmentId={item.id}
                isLatest={i === 0}
                status={item.status}
                onCommentClick={() => toggleComment(i)}
              />

              {entry.commentData && entry.commentData.length > 0 && (
                <div className="pl-6 pb-2">
                  <CommentThread comments={entry.commentData} />
                </div>
              )}

              {openInputs.has(i) && !(entry.commentData && entry.commentData.length > 0) && (
                <div className="pl-6 pb-2">
                  <div className="mt-1 border-l-2 border-border-strong px-3.5 py-1.5">
                    <CommentInput autoFocus />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
