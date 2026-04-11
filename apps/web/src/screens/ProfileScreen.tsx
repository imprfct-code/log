import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { User } from "lucide-react";
import { ProfileHeatmap } from "@/components/ProfileHeatmap";
import { ProfileCommitments } from "@/components/ProfileCommitments";

function formatJoinDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.toLocaleString("en-US", { month: "long" });
  return `${month} ${d.getFullYear()}`;
}

const BIO_MAX = 160;

function InlineBio({ initialValue }: { initialValue?: string }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialValue ?? "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function startEditing() {
    setDraft(initialValue ?? "");
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === (initialValue ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ bio: trimmed });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save bio");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = draft.trim() !== (initialValue ?? "");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void save();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, BIO_MAX))}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={BIO_MAX}
          placeholder="what are you building?"
          className="w-full resize-none border border-border bg-transparent px-2 py-1.5 text-[13px] leading-relaxed text-muted-foreground outline-none focus:border-accent/50"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/40">
            {draft.length}/{BIO_MAX}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer bg-transparent text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            >
              cancel
            </button>
            <button
              type="button"
              disabled={saving || !isDirty}
              onClick={() => void save()}
              className="cursor-pointer bg-transparent text-[11px] text-accent transition-colors hover:text-accent/80 disabled:opacity-40"
            >
              {saving ? "saving..." : "save"}
            </button>
          </div>
        </div>
        {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
      </div>
    );
  }

  if (initialValue) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="mt-2 cursor-pointer bg-transparent text-left text-[13px] leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Edit bio"
      >
        {initialValue}
      </button>
    );
  }

  return (
    <button
      onClick={startEditing}
      className="mt-2 cursor-pointer bg-transparent text-[13px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
    >
      add a bio...
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-muted" />
          <div className="h-3 w-44 bg-muted/60" />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4">
        <div className="h-3 w-16 bg-muted/60" />
        <div className="h-3 w-16 bg-muted/60" />
        <div className="h-3 w-20 bg-muted/60" />
      </div>

      {/* Heatmap */}
      <div className="mt-8">
        <div className="mb-2 flex justify-between">
          <div className="h-3 w-48 bg-muted/40" />
          <div className="h-3 w-24 bg-muted/40" />
        </div>
        <div className="flex w-full gap-[3px]">
          {Array.from({ length: 52 }, (_, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
              {Array.from({ length: 7 }, (_, di) => (
                <div key={di} className="aspect-square w-full bg-[#111111]" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-4 border-b border-border pb-2.5">
        <div className="h-3 w-12 bg-muted/60" />
        <div className="h-3 w-20 bg-muted/40" />
        <div className="h-3 w-16 bg-muted/40" />
      </div>

      {/* Commitment rows */}
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-48 bg-muted" />
            <div className="h-3 w-64 bg-muted/40" />
          </div>
          <div className="flex h-8 w-16 gap-0.5">
            {Array.from({ length: 7 }, (_, j) => (
              <div
                key={j}
                className="flex-1 self-end bg-muted/30"
                style={{ height: `${30 + Math.sin(i + j) * 25}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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
      commentCount: 0,
    }));
    const building = profile.active.map((c) => ({
      ...c,
      status: "building" as const,
      respectCount: 0,
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
            <span className="text-foreground-bright">{stats.totalRespects}</span>{" "}
            {stats.totalRespects === 1 ? "respect" : "respects"}
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
