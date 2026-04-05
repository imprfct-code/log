export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="skeleton h-3.5 w-16" />
            <div className="skeleton h-3.5 w-1" />
            <div className="skeleton h-3.5 w-28" />
            <div className="ml-auto skeleton h-3 w-14" />
          </div>
          <div className="skeleton h-4 w-3/4" />
          <div className="flex flex-col gap-2 border-l border-border-strong pl-6">
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-4/5" />
            <div className="skeleton h-3.5 w-2/3" />
          </div>
          <div className="flex gap-4">
            <div className="skeleton h-3 w-8" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
