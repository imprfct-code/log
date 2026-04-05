import { commitments } from "@/data/mock";
import { GhIcon, ExtIcon } from "@/components/Icons";
import { ProfileHeatmap } from "@/components/ProfileHeatmap";
import { ProfilePinned } from "@/components/ProfilePinned";
import { ProfileCommitments } from "@/components/ProfileCommitments";
import { ProfileActivity } from "@/components/ProfileActivity";

const userCommitments = commitments.filter((c) => c.user === "maksim");
const buildingItems = userCommitments.filter((c) => c.status === "building");
const shippedItems = userCommitments.filter((c) => c.status === "shipped");
const pinnedItems = [buildingItems[0], shippedItems[0]].filter(Boolean);

const recentActivity = userCommitments
  .flatMap((c) =>
    c.devlog.map((entry) => ({
      ...entry,
      commitmentTitle: c.text,
      commitmentId: c.id,
    })),
  )
  .slice(0, 6);

const STATS = [
  { label: "ships", value: "2", color: "#5cb870" },
  { label: "building", value: "1", color: "#c7787a" },
  { label: "respect", value: "23", color: "#e8e8e8" },
  { label: "streak", value: "12d", color: "#e8e8e8" },
];

export function ProfileScreen() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
      {/* Header */}
      <div className="feed-in flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-accent text-xl font-bold text-foreground-bright">
          M
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h1 className="m-0 text-xl font-extrabold tracking-tight text-foreground-bright">
              maksim
            </h1>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              joined jan 2026
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-muted-foreground">
            <span>building things that ship</span>
            <span className="text-[#333]">&middot;</span>
            <span className="flex items-center gap-1">
              <GhIcon size={11} color="#666" />
              <span className="flex cursor-pointer items-center gap-0.5 hover:text-foreground">
                imprfct-code <ExtIcon size={9} color="currentColor" />
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="feed-in mt-6 flex gap-6" style={{ animationDelay: "0.05s" }}>
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="text-lg font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="feed-in mt-8" style={{ animationDelay: "0.1s" }}>
        <ProfileHeatmap />
      </div>

      {/* Pinned */}
      <div className="feed-in mt-10" style={{ animationDelay: "0.15s" }}>
        <ProfilePinned items={pinnedItems} />
      </div>

      {/* Commitments */}
      <div className="feed-in mt-10" style={{ animationDelay: "0.2s" }}>
        <ProfileCommitments all={userCommitments} building={buildingItems} shipped={shippedItems} />
      </div>

      {/* Recent Activity */}
      <div className="feed-in mt-10" style={{ animationDelay: "0.25s" }}>
        <ProfileActivity entries={recentActivity} />
      </div>
    </div>
  );
}
