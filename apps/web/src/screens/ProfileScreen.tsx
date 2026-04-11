import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { User } from "lucide-react";
import { ProfileHeatmap } from "@/components/ProfileHeatmap";
import { ProfileCommitments } from "@/components/ProfileCommitments";
import { InlineBio } from "@/components/InlineBio";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";

function formatJoinDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.toLocaleString("en-US", { month: "long" });
  return `${month} ${d.getFullYear()}`;
}

export function ProfileScreen() {
  const { username } = useParams();
  const profile = useQuery(api.users.getProfile, username ? { username } : "skip");
  const me = useQuery(api.users.getMe);
  const heatmapData = useQuery(
    api.devlog.getActivityForHeatmap,
    profile?.user?._id ? { userId: profile.user._id } : "skip",
  );

  const isOwnProfile =
    me !== undefined && profile?.user !== undefined && me?._id === profile.user._id;

  const commitments = useMemo(() => {
    if (!profile) return { all: [], building: [], released: [] };
    const released = profile.shipped.map((c) => ({
      ...c,
      status: "shipped" as const,
      boostCount: c.boostCount,
      commentCount: 0,
    }));
    const building = profile.active.map((c) => ({
      ...c,
      status: "building" as const,
      boostCount: 0,
    }));
    const all = [...building, ...released];
    return { all, building, released };
  }, [profile]);

  // Loading
  if (profile === undefined) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
        <ProfileSkeleton />
      </div>
    );
  }

  // User not found
  if (profile === null) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
        <div className="py-16 text-center text-sm text-muted-foreground">
          this profile doesn't exist.
        </div>
      </div>
    );
  }

  const { user, stats } = profile;
  const hasCommitments = stats.totalShips + stats.activeCount > 0;

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
      {/* Header */}
      <div className="feed-in opacity-0">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.username}'s avatar`}
              className="h-14 w-14 shrink-0 bg-muted object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-muted">
              <User size={24} className="text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground-bright">{user.username}</h1>
            <p className="text-[11px] text-muted-foreground">
              on log since {formatJoinDate(user._creationTime)}
            </p>
          </div>
        </div>

        {/* Bio */}
        {isOwnProfile ? (
          <InlineBio initialValue={user.bio} />
        ) : (
          user.bio && (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{user.bio}</p>
          )
        )}

        {/* Stats */}
        <div className="mt-4 flex gap-5 text-[12px] tabular-nums text-muted-foreground">
          <span>
            <span className="text-foreground-bright">{stats.activeCount}</span> active
          </span>
          <span>
            <span className="text-foreground-bright">{stats.totalShips}</span>{" "}
            {stats.totalShips === 1 ? "release" : "releases"}
          </span>
          <span>
            <span className="text-foreground-bright">{stats.totalBoosts}</span>{" "}
            {stats.totalBoosts === 1 ? "boost" : "boosts"}
          </span>
          {user.streak > 0 && (
            <span>
              <span className="text-foreground-bright">{user.streak}</span> day streak
            </span>
          )}
        </div>
      </div>

      {/* Heatmap */}
      {heatmapData && (
        <div className="feed-in mt-8 opacity-0" style={{ animationDelay: "60ms" }}>
          <ProfileHeatmap data={heatmapData} />
        </div>
      )}

      {/* Commitments or empty state */}
      <div className="feed-in mt-8 opacity-0" style={{ animationDelay: "120ms" }}>
        {hasCommitments ? (
          <ProfileCommitments
            all={commitments.all}
            building={commitments.building}
            released={commitments.released}
          />
        ) : isOwnProfile ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">you haven't committed to anything yet.</p>
            <Link
              to="/create"
              className="mt-3 inline-block text-sm text-accent no-underline hover:text-accent/80"
            >
              make your first commitment &rarr;
            </Link>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {user.username} hasn't released anything yet.
          </div>
        )}
      </div>
    </div>
  );
}
