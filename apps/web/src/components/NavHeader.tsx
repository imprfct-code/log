import { Link, useLocation } from "react-router";
import { LogIcon } from "./LogIcon";
import { Plus, User } from "lucide-react";

const hasActiveCommitment = false;

export function NavHeader() {
  const location = useLocation();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <LogIcon size={20} />
        <span className="text-sm font-bold text-foreground-bright">imprfct Log</span>
      </Link>

      <nav className="flex items-center gap-4">
        <Link
          to="/feed"
          className={`text-xs no-underline transition-colors ${
            location.pathname.startsWith("/feed")
              ? "text-foreground-bright"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          feed
        </Link>
        {!hasActiveCommitment && (
          <Link
            to="/create"
            className="flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[12px] text-muted-foreground no-underline transition-colors hover:border-accent/40 hover:text-foreground-bright"
          >
            <Plus size={12} />
            commit
          </Link>
        )}
        <Link
          to="/profile/maksim"
          className={`flex items-center justify-center rounded-full border border-border p-1.5 no-underline transition-colors ${
            location.pathname.startsWith("/profile")
              ? "border-accent/40 text-foreground-bright"
              : "text-muted-foreground hover:border-border-strong hover:text-foreground"
          }`}
        >
          <User size={14} />
        </Link>
      </nav>
    </header>
  );
}
