import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

const MESSAGES = [
  {
    line: "this page was on the roadmap.",
    sub: "the roadmap lied.",
  },
  {
    line: "someone committed to shipping this page.",
    sub: "day 1 was 47 days ago.",
  },
  {
    line: "this page works on localhost.",
    sub: "just not here.",
  },
  {
    line: "this page was released once.",
    sub: "then force-pushed into oblivion.",
  },
  {
    line: "this page got reverted on a Friday deploy.",
    sub: "nobody knows why. nobody asked.",
  },
];

export function NotFoundScreen() {
  const [index] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const message = MESSAGES[index];

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        {/* 404 with accent glow */}
        <h1
          className="landing-up text-8xl font-extrabold tracking-tighter text-foreground-bright opacity-0"
          style={{
            animationDelay: "0ms",
            textShadow: "0 0 60px var(--color-accent-soft), 0 0 120px var(--color-accent-soft)",
          }}
        >
          404
        </h1>

        {/* Divider */}
        <div
          className="landing-up my-5 h-px w-12 bg-border-strong opacity-0"
          style={{ animationDelay: "100ms" }}
        />

        {/* Message */}
        <p
          className="landing-up text-[15px] leading-relaxed text-foreground opacity-0"
          style={{ animationDelay: "200ms" }}
        >
          {message.line}
        </p>
        <p
          className="landing-up text-[15px] leading-relaxed text-muted-foreground opacity-0"
          style={{ animationDelay: "350ms" }}
        >
          {message.sub}
        </p>

        {/* Back button — hover lift + glow like landing CTA */}
        <Link
          to="/feed"
          className="landing-up not-found-cta group mt-10 inline-flex cursor-pointer items-center gap-2 border border-border px-6 py-2.5 text-sm text-muted-foreground opacity-0 transition-all duration-200 hover:border-accent/40 hover:text-foreground-bright"
          style={{ animationDelay: "550ms" }}
        >
          back
          <ArrowRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>
  );
}
