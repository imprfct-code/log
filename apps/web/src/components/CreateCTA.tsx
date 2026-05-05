import { Link } from "react-router";

export function CreateCTA() {
  return (
    <Link
      to="/create"
      className="glow-card group block border border-border-strong p-4 no-underline transition-colors hover:border-accent/40"
    >
      <div className="text-sm font-semibold text-foreground-bright">
        I'm building{" "}
        <span className="text-muted-foreground">
          ___<span className="landing-cursor">|</span>
        </span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground/50">
        declare your next project
      </div>
    </Link>
  );
}
