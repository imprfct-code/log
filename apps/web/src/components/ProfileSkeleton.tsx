export function ProfileSkeleton() {
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
