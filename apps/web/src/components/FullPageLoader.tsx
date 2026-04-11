import { useEffect, useState } from "react";
import { LogIcon } from "@/components/LogIcon";

function AnimatedDots() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => setCount((c) => (c % 3) + 1), 500);
    return () => clearInterval(interval);
  }, []);

  return <span className="inline-block w-[1.5ch] text-left">{".".repeat(count)}</span>;
}

export function FullPageLoader({ text = "Loading" }: { text?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2">
        <div className="-mb-4 animate-pulse motion-reduce:animate-none">
          <LogIcon size={48} />
        </div>
        <span className="font-mono text-xs tracking-wider text-muted-foreground">
          {text}
          <AnimatedDots />
        </span>
      </div>
    </div>
  );
}
