export function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {CARDS.map(({ id, meta, title, entries }) => (
        <div
          key={id}
          className="border-b border-border pb-5"
          style={{ animationDelay: `${id * 80}ms` }}
        >
          {/* Meta row: username / repo ... status */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className={`skeleton h-3.5 rounded-sm ${meta.user}`} />
            <div className="h-3.5 w-2 opacity-10" />
            <div className={`skeleton h-3.5 rounded-sm ${meta.repo}`} />
            <div className="ml-auto flex items-center gap-2">
              <div className="skeleton h-2.5 w-16 rounded-sm" />
              <div className="skeleton h-3 w-10 rounded-sm" />
            </div>
          </div>

          {/* Title */}
          <div className={`skeleton mt-2 mb-2 h-4 rounded-sm ${title}`} />

          {/* Timeline entries */}
          <div className="relative border-l border-border-strong">
            {entries.map((entry) => (
              <div key={entry.id} className="relative flex items-center gap-2.5 py-1.5 pl-6">
                <span className="absolute left-0 top-1/2 h-[7px] w-[7px] -translate-x-[3.5px] -translate-y-1/2 rounded-full border border-border-strong bg-muted" />
                <div className={`skeleton h-3 rounded-sm ${entry.hash}`} />
                <div className={`skeleton h-3 flex-1 rounded-sm ${entry.msg}`} />
                <div className={`skeleton h-2.5 shrink-0 rounded-sm ${entry.time}`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const CARDS = [
  {
    id: 0,
    meta: { user: "w-20", repo: "w-32" },
    title: "w-3/4",
    entries: [
      { id: 0, hash: "w-12", msg: "max-w-[60%]", time: "w-8" },
      { id: 1, hash: "w-12", msg: "max-w-[45%]", time: "w-6" },
      { id: 2, hash: "w-12", msg: "max-w-[70%]", time: "w-8" },
    ],
  },
  {
    id: 1,
    meta: { user: "w-16", repo: "w-28" },
    title: "w-1/2",
    entries: [
      { id: 0, hash: "w-12", msg: "max-w-[55%]", time: "w-7" },
      { id: 1, hash: "w-12", msg: "max-w-[40%]", time: "w-8" },
    ],
  },
  {
    id: 2,
    meta: { user: "w-24", repo: "w-36" },
    title: "w-2/3",
    entries: [
      { id: 0, hash: "w-12", msg: "max-w-[50%]", time: "w-6" },
      { id: 1, hash: "w-12", msg: "max-w-[65%]", time: "w-8" },
      { id: 2, hash: "w-12", msg: "max-w-[35%]", time: "w-7" },
      { id: 3, hash: "w-12", msg: "max-w-[55%]", time: "w-6" },
    ],
  },
  {
    id: 3,
    meta: { user: "w-16", repo: "w-24" },
    title: "w-5/12",
    entries: [
      { id: 0, hash: "w-12", msg: "max-w-[48%]", time: "w-8" },
      { id: 1, hash: "w-12", msg: "max-w-[60%]", time: "w-7" },
    ],
  },
  {
    id: 4,
    meta: { user: "w-14", repo: "w-28" },
    title: "w-7/12",
    entries: [
      { id: 0, hash: "w-12", msg: "max-w-[42%]", time: "w-6" },
      { id: 1, hash: "w-12", msg: "max-w-[58%]", time: "w-8" },
      { id: 2, hash: "w-12", msg: "max-w-[50%]", time: "w-7" },
    ],
  },
];
