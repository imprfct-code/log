import { useClerk } from "@clerk/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "@convex/_generated/api";
import { useGithubLogin } from "@/lib/auth";
import { GhIcon } from "./Icons";
import { LogIcon } from "./LogIcon";
import { Loader2, Plus, Settings, User, LogOut } from "lucide-react";

export function NavHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useClerk();
  const { login, isLoggingIn } = useGithubLogin();
  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <LogIcon size={20} />
        <span className="text-sm font-bold text-foreground-bright">log</span>
      </Link>

      <nav className="flex items-center gap-4">
        {isAuthenticated && (
          <Link
            to="/create"
            className="flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[12px] text-muted-foreground no-underline transition-colors hover:border-accent/40 hover:text-foreground-bright"
          >
            <Plus size={12} />
            commit
          </Link>
        )}

        {isLoading ? (
          <div className="h-7 w-7 animate-pulse rounded-full bg-border" />
        ) : isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link
              to={me ? `/profile/${me.username}` : "/feed"}
              className={`flex items-center justify-center overflow-hidden rounded-full border border-border no-underline transition-colors ${
                location.pathname.startsWith("/profile")
                  ? "border-accent/40"
                  : "hover:border-border-strong"
              }`}
            >
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt={me.username} className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center text-muted-foreground">
                  <User size={14} />
                </div>
              )}
            </Link>
            <Link
              to="/settings"
              className={`flex items-center justify-center border-none bg-transparent p-0 no-underline transition-colors ${
                location.pathname === "/settings"
                  ? "text-foreground-bright"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings size={14} />
            </Link>
            <button
              type="button"
              className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                void navigate("/", { state: { signOut: true } });
                void signOut();
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isLoggingIn}
            className="flex cursor-pointer items-center gap-1.5 border border-border bg-transparent px-2.5 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground-bright disabled:pointer-events-none disabled:opacity-50"
            onClick={login}
          >
            {isLoggingIn ? <Loader2 size={13} className="animate-spin" /> : <GhIcon size={13} />}
            {isLoggingIn ? "logging in…" : "login"}
          </button>
        )}
      </nav>
    </header>
  );
}
