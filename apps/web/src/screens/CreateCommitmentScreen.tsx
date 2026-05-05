import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { CommitCard } from "@/components/CommitCard";
import { RepoPickerInput } from "@/components/RepoPickerInput";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/lib/convexError";
import type { Id } from "@convex/_generated/dataModel";
import type { Commitment } from "@/types";

const MAX_DECLARATION = 80;
const IDEA_INTERVAL = 4500;

const IDEAS = [
  "a CLI tool for managing dotfiles",
  "an AI-powered code reviewer",
  "a real-time multiplayer chess game",
  "a markdown-to-slides converter",
  "a personal finance tracker",
  "a screenshot-to-code tool",
  "a git-based CMS for static sites",
  "a podcast transcriber with speaker detection",
  "a browser extension for tab management",
  "a design token generator from Figma",
  "a self-hosted analytics dashboard",
  "a recipe app that reads your fridge",
  "a habit tracker that syncs with GitHub",
  "a minimal blogging engine in Rust",
  "a collaborative whiteboard for remote teams",
  "a package size analyzer for npm",
  "a Spotify playlist generator using AI",
  "a URL shortener with analytics",
  "a webhook testing tool",
  "a type-safe API client generator",
];

function buildPreviewCommitment(
  text: string,
  repo: string,
  username?: string,
  avatar?: string,
): Commitment {
  return {
    id: "" as Id<"commitments">,
    user: username ?? "you",
    avatar: avatar ?? "",
    text,
    repo: repo || "",
    showMessages: true,
    showHashes: true,
    showBranches: true,
    day: 1,
    comments: 0,
    devlog: [],
    boosts: 0,
    status: "building",
    activity: [0, 0, 0, 0, 0, 0, 1],
  };
}

export function CreateCommitmentScreen() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const createCommitment = useAction(api.commitments.create);
  const me = useQuery(api.users.getMe);

  const [declaration, setDeclaration] = useState("");
  const [showRepo, setShowRepo] = useState(false);
  const [repo, setRepo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [ideaVisible, setIdeaVisible] = useState(true);

  const trimmed = declaration.trim();
  const canSubmit = trimmed.length > 0 && !submitting;
  const remaining = MAX_DECLARATION - declaration.length;

  useEffect(() => {
    if (trimmed) return;
    const interval = setInterval(() => {
      setIdeaVisible(false);
      setTimeout(() => {
        setIdeaIndex((i) => (i + 1) % IDEAS.length);
        setIdeaVisible(true);
      }, 150);
    }, IDEA_INTERVAL);
    return () => clearInterval(interval);
  }, [trimmed]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await createCommitment({
        text: trimmed,
        repo: repo || undefined,
      });
      void navigate(`/commitment/${id}`);
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to create commitment"));
      setTimeout(() => setError(null), 5000);
      setSubmitting(false);
    }
  }

  function acceptIdea() {
    if (!trimmed) {
      setDeclaration(IDEAS[ideaIndex]);
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="relative mx-auto max-w-[720px] px-4 py-6 sm:px-12 sm:py-8">
        <div className="feed-in mb-6 opacity-0">
          <div className="mb-1 text-[13px] text-accent">new commitment</div>
          <h2 className="m-0 mb-0.5 text-2xl font-bold tracking-tight text-foreground-bright">
            What are you building?
          </h2>
          <p className="text-sm text-muted-foreground">Say it out loud, then ship it.</p>
        </div>

        <div className="feed-in mb-1 opacity-0" style={{ animationDelay: "60ms" }}>
          <label
            htmlFor="declaration"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
          >
            I&apos;m building...
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="declaration"
              value={declaration}
              onChange={(e) => {
                if (e.target.value.length <= MAX_DECLARATION) {
                  setDeclaration(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !trimmed) {
                  e.preventDefault();
                  acceptIdea();
                }
              }}
              autoComplete="off"
              className="relative z-10 w-full border-b border-border-strong bg-transparent px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
            />
            {!trimmed && (
              <button
                type="button"
                onClick={acceptIdea}
                tabIndex={-1}
                aria-label={`Use suggestion: ${IDEAS[ideaIndex]}`}
                className={cn(
                  "absolute inset-0 flex cursor-text items-center border-none bg-transparent px-3.5 text-left font-mono text-sm text-muted-foreground transition-opacity duration-150",
                  ideaVisible ? "opacity-100" : "opacity-0",
                )}
              >
                {IDEAS[ideaIndex]}
              </button>
            )}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-end">
          <span
            className={cn(
              "text-[11px] transition-colors",
              remaining <= 0 ? "text-destructive" : remaining <= 15 ? "text-accent" : "text-[#333]",
            )}
          >
            {remaining}
          </span>
        </div>

        <div className="feed-in relative z-10 mb-6 opacity-0" style={{ animationDelay: "120ms" }}>
          {!showRepo ? (
            <button
              type="button"
              onClick={() => setShowRepo(true)}
              className="cursor-pointer border-none bg-transparent p-0 font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              + link a github repo
            </button>
          ) : (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                GitHub repo
                <span className="ml-2 normal-case tracking-normal text-[#333]">optional</span>
              </label>
              <RepoPickerInput value={repo} onChange={setRepo} />
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>

        {trimmed && (
          <>
            <div className="feed-in mb-3 flex items-center gap-3 text-[11px] text-muted-foreground opacity-0">
              <span>preview</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="feed-in mb-6 opacity-0">
              <CommitCard
                item={buildPreviewCommitment(trimmed, repo, me?.username, me?.avatarUrl)}
                preview
              />
            </div>
          </>
        )}

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            trimmed.length > 0 ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full font-semibold landing-cta",
                submitting && "pointer-events-none opacity-70",
              )}
            >
              {submitting ? "committing..." : "Commit publicly"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
