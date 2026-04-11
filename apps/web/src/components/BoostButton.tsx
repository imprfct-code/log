import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { BoostIcon, BoostIconFilled } from "./Icons";

export function BoostButton({
  commitmentId,
  initialCount,
}: {
  commitmentId: Id<"commitments">;
  initialCount: number;
}) {
  const { isAuthenticated } = useConvexAuth();
  const serverBoosted = useQuery(api.boosts.hasBoosted, { commitmentId });
  const toggle = useMutation(api.boosts.toggle);

  const [optimistic, setOptimistic] = useState<{ boosted: boolean; count: number } | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear optimistic state when server catches up
  useEffect(() => {
    setOptimistic(null);
  }, [serverBoosted]);

  // Cleanup pulse timer on unmount
  useEffect(() => {
    return () => clearTimeout(pulseTimerRef.current);
  }, []);

  const boosted = optimistic?.boosted ?? serverBoosted ?? false;
  const count = optimistic?.count ?? initialCount;

  async function handleClick() {
    if (!isAuthenticated) return;
    const nextBoosted = !boosted;
    const nextCount = nextBoosted ? count + 1 : Math.max(0, count - 1);
    setOptimistic({ boosted: nextBoosted, count: nextCount });
    if (nextBoosted) {
      setPulsing(true);
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulsing(false), 300);
    }
    try {
      await toggle({ commitmentId });
    } catch {
      setOptimistic(null);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isAuthenticated}
      aria-label={boosted ? `Boosted — ${count} total` : `Boost — ${count} total`}
      aria-pressed={boosted}
      className={`flex items-center gap-1.5 border-none bg-transparent font-mono text-[11px] transition-colors ${
        isAuthenticated ? "cursor-pointer" : "cursor-default"
      } ${boosted ? "text-boost" : "text-muted-foreground hover:text-boost"} ${pulsing ? "boost-pulse" : ""}`}
    >
      {boosted ? (
        <BoostIconFilled size={11} color="currentColor" />
      ) : (
        <BoostIcon size={11} color="currentColor" />
      )}
      {count} {count === 1 ? "boost" : "boosts"}
    </button>
  );
}
