import { AuthenticateWithRedirectCallback } from "@clerk/react";
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

export function SSOCallbackScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <div className="animate-pulse">
          <LogIcon size={80} />
        </div>
        <span className="font-mono text-xs tracking-wider text-muted-foreground">
          Signing in
          <AnimatedDots />
        </span>
      </div>

      <div className="absolute">
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
