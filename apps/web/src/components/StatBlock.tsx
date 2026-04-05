type Stat = {
  label: string;
  value: string;
  color: string;
};

export function StatBlock({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex gap-6">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-[22px] font-bold" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
