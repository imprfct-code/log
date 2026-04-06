import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { LogIcon } from "@/components/LogIcon";
import { GhIcon } from "@/components/Icons";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GlowCard } from "@/components/GlowCard";
import { CommitCard } from "@/components/CommitCard";
import { useReveal } from "@/hooks/useReveal";
import { useGithubLogin } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Commitment } from "@/data/mock";

const WORDS = ["story", "truth", "proof"];
const WORD_INTERVAL = 2500;
const INITIAL_DELAY = 2200;

const STEPS = [
  {
    title: "Commit publicly",
    text: "Declare what you\u2019re building \u2014 one sentence, linked to a GitHub repo.",
  },
  {
    title: "Push code",
    text: "Every commit you push auto-appears in your public devlog. No writing required.",
  },
  {
    title: "Ship it",
    text: "When you\u2019re done, mark it shipped. Your full journey stays visible.",
  },
];

const PERSONAS = [
  {
    quote: "12 ideas in Notion, 0 live projects.",
    text: "A public commitment is the gentlest push to actually start. Unfinished is normal here.",
  },
  {
    quote: "3 projects shipped, zero blog posts.",
    text: "Your git history is the devlog. Profile that speaks through work, not self-presentation.",
  },
  {
    quote: "Not building yet \u2014 just watching.",
    text: "Browse the feed, see real struggles and progress. No login required.",
  },
  {
    quote: "Thousands use my library. Nobody knows I exist.",
    text: "Your commits already tell the story. Log just makes them visible.",
  },
];

const PREVIEW_COMMITMENT: Commitment = {
  id: 0,
  user: "danielle",
  avatar: "D",
  text: "an AI recipe generator",
  repo: "dani/recipe-ai",
  day: 7,
  comments: 0,
  respects: 12,
  status: "building",
  daysAgo: 0,
  activity: [0, 2, 1, 0, 3, 1, 2],
  commentData: [],
  devlog: [
    {
      type: "commit",
      hash: "f1a2b3c",
      text: "add OpenAI integration for recipe parsing",
      time: "3h ago",
      comments: 0,
    },
    {
      type: "post",
      text: "Day 7: stuck on deploy. Vercel keeps timing out.",
      time: "8h ago",
      comments: 0,
    },
    {
      type: "commit",
      hash: "a1b2c3d",
      text: "fix: timeout on serverless function",
      time: "1d ago",
      comments: 0,
    },
  ],
};

function GitHubLoginButton({
  isLoggingIn,
  onClick,
}: {
  isLoggingIn: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isLoggingIn}
      className={cn(
        buttonVariants({ variant: "default" }),
        "landing-cta cursor-pointer disabled:pointer-events-none disabled:opacity-50",
      )}
      onClick={onClick}
    >
      {isLoggingIn ? <Loader2 size={14} className="animate-spin" /> : <GhIcon size={14} />}
      {isLoggingIn ? "Logging in…" : "Login with GitHub"}
    </button>
  );
}

export function LandingScreen() {
  const { isAuthenticated } = useConvexAuth();
  const location = useLocation();
  const isSigningOut = (location.state as { signOut?: boolean })?.signOut === true;
  const { login, isLoggingIn } = useGithubLogin();
  const [wordIndex, setWordIndex] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [howRef, howVisible] = useReveal();
  const [personasRef, personasVisible] = useReveal();
  const [previewRef, previewVisible] = useReveal();
  const [footerRef, footerVisible] = useReveal();

  useEffect(() => {
    if (isAuthenticated) return;
    let interval: number;
    const timeout = setTimeout(() => {
      interval = window.setInterval(() => {
        setWordIndex((i) => (i + 1) % WORDS.length);
        setRotating(true);
      }, WORD_INTERVAL);
    }, INITIAL_DELAY);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  if (isAuthenticated && !isSigningOut) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <div
      className={cn("relative min-h-screen overflow-hidden", isSigningOut && "skip-landing-anim")}
    >
      <div className="landing-orb" aria-hidden="true" />
      <div className="landing-grid" aria-hidden="true" />

      <div className="relative mx-auto max-w-[720px] px-12 pt-20 pb-16">
        <div
          className="landing-up mb-16 flex items-center justify-between opacity-0"
          style={{ animationDelay: "0ms" }}
        >
          <div className="group flex cursor-default items-center gap-2.5">
            <div className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
              <LogIcon size={20} />
            </div>
            <span className="text-sm font-bold text-foreground-bright">imprfct Log</span>
          </div>
          <Link
            to="/feed"
            className="text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            View feed
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="m-0 text-4xl font-extrabold leading-[1.2] tracking-tighter text-foreground-bright">
            <span className="landing-up inline-block opacity-0" style={{ animationDelay: "150ms" }}>
              Make a public commitment.
            </span>
            <br />
            <span className="landing-up inline-block opacity-0" style={{ animationDelay: "300ms" }}>
              Let your git history
            </span>
            <br />
            <span className="landing-up inline-block opacity-0" style={{ animationDelay: "450ms" }}>
              tell the{" "}
              <span className="inline-flex h-[1.2em] items-end overflow-hidden align-bottom">
                <span
                  key={wordIndex}
                  className={cn("inline-block text-accent", rotating && "landing-word-in")}
                  style={{ textShadow: "0 0 40px var(--color-accent-soft)" }}
                >
                  {WORDS[wordIndex]}
                </span>
              </span>
              .
            </span>
          </h1>
        </div>

        <p
          className="landing-up mb-10 max-w-[520px] text-[15px] leading-relaxed text-muted-foreground opacity-0"
          style={{ animationDelay: "600ms" }}
        >
          imprfct Log turns your GitHub commits into an automatic devlog. Declare what you're
          building, connect your repo, and every push becomes a public entry \u2014 without writing
          a single post.
        </p>

        <div className="landing-up opacity-0" style={{ animationDelay: "750ms" }}>
          <GitHubLoginButton isLoggingIn={isLoggingIn} onClick={login} />
          <div className="mt-2 text-[11px] text-[#333]">Free. Takes 30 seconds.</div>
        </div>

        <div ref={howRef} className="mt-20">
          <div
            className={cn(
              "mb-6 text-[11px] uppercase tracking-widest text-accent opacity-0",
              howVisible && "landing-up",
            )}
          >
            how it works
          </div>
          <div className="relative pl-5">
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-0.5 bg-border-strong",
                howVisible && "landing-line-grow",
              )}
            />
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className={cn("mb-6 opacity-0", howVisible && "landing-up")}
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span className="text-sm font-bold text-accent">{i + 1}.</span>
                  <span className="text-sm font-semibold text-foreground-bright">{step.title}</span>
                </div>
                <div className="ml-5 text-[13px] text-muted-foreground">{step.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div ref={personasRef} className="mt-20">
          <div
            className={cn(
              "mb-6 text-[11px] uppercase tracking-widest text-accent opacity-0",
              personasVisible && "landing-up",
            )}
          >
            for builders at every stage
          </div>
          <GlowCard className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PERSONAS.map((persona, i) => (
              <div
                key={persona.quote}
                className={cn(
                  "glow-card border border-border p-4 opacity-0",
                  personasVisible && "landing-up",
                )}
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className="mb-2 text-[13px] font-semibold text-foreground-bright">
                  &ldquo;{persona.quote}&rdquo;
                </div>
                <div className="text-[13px] leading-relaxed text-muted-foreground">
                  {persona.text}
                </div>
              </div>
            ))}
          </GlowCard>
        </div>

        <div ref={previewRef} className="mt-16">
          <div
            className={cn(
              "mb-4 text-[11px] uppercase tracking-widest text-muted-foreground opacity-0",
              previewVisible && "landing-up",
            )}
          >
            what it looks like
          </div>
          <div
            className={cn("opacity-0", previewVisible && "landing-up")}
            style={{ animationDelay: "150ms" }}
          >
            <CommitCard item={PREVIEW_COMMITMENT} preview />
          </div>
        </div>

        <div ref={footerRef} className="mt-16 mb-8 text-center">
          <div className={cn("opacity-0", footerVisible && "landing-up")}>
            <Separator className="mb-10" />
            <div className="mb-4 text-lg font-semibold text-foreground-bright">
              ready to build in public?
            </div>
            <GitHubLoginButton isLoggingIn={isLoggingIn} onClick={login} />
          </div>
        </div>
      </div>
    </div>
  );
}
