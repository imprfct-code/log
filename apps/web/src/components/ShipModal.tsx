import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";

function ShareIcon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

const ICON = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  telegram:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.66-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.65-2.89 7.99-3.44 3.81-1.58 4.6-1.86 5.12-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .37z",
  reddit:
    "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z",
  email:
    "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z",
  share:
    "M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.11.9-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z",
};

type Step = "reflect" | "details" | "celebrate";

/** Modal to guide shipping a commitment: reflection, URL/note input, and celebration with stats. */
export function ShipModal({
  commitmentId,
  commitmentText,
  repo,
  previousShipUrl,
  onClose,
}: {
  commitmentId: Id<"commitments">;
  commitmentText: string;
  repo?: string;
  previousShipUrl?: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("reflect");
  const [url, setUrl] = useState(previousShipUrl ?? "");
  const [shipNote, setShipNote] = useState("");
  const [keepBuilding, setKeepBuilding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = useQuery(api.commitments.getShipStats, { id: commitmentId });
  const ship = useMutation(api.commitments.ship);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Submitted data preserved for celebration step
  const submittedRef = useRef({ url: "", shipNote: "" });

  // Body scroll lock + focus on open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the modal on mount
    contentRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Keyboard handling + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Enter" && step === "reflect" && stats) {
        setStep("details");
      }
      // Focus trap: keep Tab within the modal
      if (e.key === "Tab" && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [step, stats, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function validateUrl(rawUrl: string): string | null {
    try {
      const toValidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : "https://" + rawUrl;
      const parsed = new URL(toValidate);

      const host = parsed.hostname;
      if (
        host === "localhost" ||
        /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
        parsed.port !== "" ||
        !host.includes(".")
      ) {
        return "enter a valid url, e.g. example.com";
      }
      return null;
    } catch {
      return "enter a valid url, e.g. example.com";
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    const trimmed = url.trim();
    if (!trimmed) return;

    const validationError = validateUrl(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const note = shipNote.trim() || undefined;
      await ship({ id: commitmentId, shipUrl: trimmed, shipNote: note, keepBuilding });
      submittedRef.current = { url: trimmed, shipNote: shipNote.trim() };
      fireConfetti();
      setStep("celebrate");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to ship");
      setSubmitting(false);
    }
  }

  async function handleCopyLink() {
    const link = `${window.location.origin}/s/${commitmentId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Ship or release your project"
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 cursor-pointer border-none bg-transparent p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X size={20} />
      </button>
      <div ref={contentRef} tabIndex={-1} className="w-full max-w-[460px] px-6 outline-none">
        {step === "reflect" && (
          <ReflectStep
            stats={stats}
            commitmentText={commitmentText}
            repo={repo}
            onContinue={() => setStep("details")}
          />
        )}

        {step === "details" && (
          <DetailsStep
            url={url}
            onUrlChange={(v) => {
              setError(null);
              setUrl(v);
            }}
            shipNote={shipNote}
            onShipNoteChange={setShipNote}
            keepBuilding={keepBuilding}
            onKeepBuildingChange={setKeepBuilding}
            error={error}
            submitting={submitting}
            onBack={() => setStep("reflect")}
            onSubmit={() => void handleSubmit()}
            onValidate={(rawUrl) => {
              const validationError = validateUrl(rawUrl);
              if (validationError) setError(validationError);
            }}
          />
        )}

        {step === "celebrate" && (
          <CelebrateStep
            commitmentId={commitmentId}
            commitmentText={commitmentText}
            shipUrl={submittedRef.current.url}
            shipNote={submittedRef.current.shipNote}
            stats={stats}
            keepBuilding={keepBuilding}
            copied={copied}
            onCopyLink={handleCopyLink}
            onClose={onClose}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Step 1: Reflection ──

type ShipStats = {
  daysBuilding: number;
  totalCommits: number;
  totalPosts: number;
  totalUpdates: number;
  startedAt: number;
  firstCommit: { message: string; date: number } | null;
  lastCommit: { message: string; date: number } | null;
};

function shortDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ReflectStep({
  stats,
  commitmentText,
  repo,
  onContinue,
}: {
  stats: ShipStats | null | undefined;
  commitmentText: string;
  repo?: string;
  onContinue: () => void;
}) {
  return (
    <div className="ship-step-in opacity-0">
      <p className="mb-6 text-[13px] text-release">your journey</p>

      <p className="ship-stat-in mb-1 text-lg font-medium leading-relaxed text-foreground-bright opacity-0">
        {commitmentText}
      </p>

      {repo && (
        <a
          href={`https://github.com/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ship-stat-in block text-[12px] text-muted-foreground opacity-0 transition-colors hover:text-foreground"
          style={{ animationDelay: "60ms" }}
        >
          {repo}
        </a>
      )}

      {stats === undefined ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 w-48 animate-pulse bg-muted"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      ) : stats === null ? (
        <p className="mt-6 text-sm text-muted-foreground">could not load stats.</p>
      ) : (
        <div className="ship-stat-in mt-6 opacity-0" style={{ animationDelay: "120ms" }}>
          {/* Timeline */}
          <div className="border-l border-border-strong pl-5">
            {stats.firstCommit && (
              <div className="relative pb-4">
                <span className="absolute -left-5 top-[2px] h-[7px] w-[7px] -translate-x-[3.5px] rounded-full border border-border-strong bg-muted" />
                <p className="text-[11px] leading-none text-muted-foreground">
                  {shortDate(stats.firstCommit.date)}
                </p>
                <p className="mt-1 truncate text-[13px] text-foreground">
                  {stats.firstCommit.message}
                </p>
              </div>
            )}

            {stats.totalCommits > 2 && (
              <div className="relative pb-4">
                <span className="absolute -left-5 top-[2px] h-[7px] w-[7px] -translate-x-[3.5px] rounded-full border border-border-strong bg-muted/60" />
                <p className="text-[11px] leading-none text-muted-foreground/50">
                  {stats.totalCommits - 2} more{" "}
                  {stats.totalCommits - 2 === 1 ? "commit" : "commits"}
                </p>
              </div>
            )}

            {stats.lastCommit && (
              <div className="relative">
                <span className="absolute -left-5 top-[2px] h-[7px] w-[7px] -translate-x-[3.5px] rounded-full border border-release/50 bg-release pulse-dot-release" />
                <p className="text-[11px] leading-none text-muted-foreground">
                  {shortDate(stats.lastCommit.date)}
                </p>
                <p className="mt-1 truncate text-[13px] text-foreground">
                  {stats.lastCommit.message}
                </p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-4 flex gap-4 border-t border-border-strong pt-3 pl-5 text-[12px] text-muted-foreground">
            <span>
              <span className="text-foreground-bright">{stats.daysBuilding}</span>{" "}
              {stats.daysBuilding === 1 ? "day" : "days"}
            </span>
            <span>
              <span className="text-foreground-bright">{stats.totalCommits}</span>{" "}
              {stats.totalCommits === 1 ? "commit" : "commits"}
            </span>
            {stats.totalPosts > 0 && (
              <span>
                <span className="text-foreground-bright">{stats.totalPosts}</span>{" "}
                {stats.totalPosts === 1 ? "post" : "posts"}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Button variant="ship" size="lg" disabled={!stats} onClick={onContinue}>
          continue
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Details ──

function DetailsStep({
  url,
  onUrlChange,
  shipNote,
  onShipNoteChange,
  keepBuilding,
  onKeepBuildingChange,
  error,
  submitting,
  onBack,
  onSubmit,
  onValidate,
}: {
  url: string;
  onUrlChange: (v: string) => void;
  shipNote: string;
  onShipNoteChange: (v: string) => void;
  keepBuilding: boolean;
  onKeepBuildingChange: (v: boolean) => void;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onValidate: (value: string) => void;
}) {
  return (
    <div className="ship-step-in opacity-0">
      <p className="mb-6 text-center text-[13px] text-release">
        {keepBuilding ? "ship it" : "release it"}
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="ship-url" className="mb-1.5 block text-[11px] text-muted-foreground">
            url <span className="text-accent">*</span>
          </label>
          <div
            className={cn(
              "border-b transition-colors focus-within:border-release",
              error ? "border-destructive" : "border-border-strong",
            )}
          >
            <input
              id="ship-url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onBlur={() => {
                const trimmed = url.trim();
                if (trimmed) onValidate(trimmed);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="https://..."
              autoFocus
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? "ship-url-error" : undefined}
              className="w-full bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {error && (
            <p id="ship-url-error" role="alert" className="mt-1.5 text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="ship-note" className="mb-1.5 block text-[11px] text-muted-foreground">
            note <span className="text-muted-foreground/50">(optional)</span>
          </label>
          <div className="border-b border-border-strong transition-colors focus-within:border-release">
            <textarea
              id="ship-note"
              value={shipNote}
              onChange={(e) => onShipNoteChange(e.target.value)}
              placeholder="what would you tell someone just starting?"
              maxLength={500}
              rows={2}
              className="w-full resize-none bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground [field-sizing:content]"
            />
          </div>
        </div>

        <div className="pt-4 text-center">
          <div
            className="inline-flex gap-1 border border-border-strong bg-muted/50 p-1"
            role="group"
            aria-label="Shipping status"
          >
            <button
              type="button"
              aria-pressed={!keepBuilding}
              onClick={() => onKeepBuildingChange(false)}
              className={cn(
                "border px-4 py-2 text-xs font-medium transition-all",
                !keepBuilding
                  ? "border-foreground-bright/30 bg-foreground-bright/5 text-foreground-bright"
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              done
            </button>
            <button
              type="button"
              aria-pressed={keepBuilding}
              onClick={() => onKeepBuildingChange(true)}
              className={cn(
                "border px-4 py-2 text-xs font-medium transition-all",
                keepBuilding
                  ? "border-release/30 bg-release/10 text-release"
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              keep building
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {keepBuilding ? "ship a version — keep the devlog going" : "release your project"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer border-none bg-transparent font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; back
        </button>
        <Button variant="ship" disabled={!url.trim() || submitting} onClick={onSubmit}>
          {submitting ? "..." : keepBuilding ? "ship it" : "release it"}
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Celebration ──

function CelebrateStep({
  commitmentId,
  commitmentText,
  shipUrl,
  shipNote,
  stats,
  keepBuilding,
  copied,
  onCopyLink,
  onClose,
}: {
  commitmentId: Id<"commitments">;
  commitmentText: string;
  shipUrl: string;
  shipNote: string;
  stats: ShipStats | null | undefined;
  keepBuilding: boolean;
  copied: boolean;
  onCopyLink: () => void;
  onClose: () => void;
}) {
  const href = /^https?:\/\//i.test(shipUrl) ? shipUrl : `https://${shipUrl}`;

  return (
    <div className="ship-step-in opacity-0 text-center">
      <p
        className="ship-celebrate mb-8 text-3xl font-bold text-release opacity-0"
        style={{ textShadow: "0 0 40px var(--color-release-soft)" }}
      >
        {keepBuilding ? "shipped!" : "released!"}
      </p>

      <div className="mx-auto max-w-[340px] border border-release/30 bg-release/5 p-5 text-left">
        <p className="mb-2 text-sm font-medium leading-relaxed text-foreground-bright">
          {commitmentText}
        </p>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center gap-1 text-[12px] text-release transition-colors hover:text-release/80"
        >
          {shipUrl} <ExternalLink size={10} />
        </a>

        {shipNote && (
          <p className="mb-2 text-[12px] italic text-muted-foreground">&ldquo;{shipNote}&rdquo;</p>
        )}

        {stats && (
          <p className="text-[11px] text-muted-foreground">
            {stats.daysBuilding} days &middot; {stats.totalCommits} commits
          </p>
        )}
      </div>

      <ShareButtons
        commitmentId={commitmentId}
        commitmentText={commitmentText}
        stats={stats}
        keepBuilding={keepBuilding}
        copied={copied}
        onCopyLink={onCopyLink}
        onClose={onClose}
      />
    </div>
  );
}

// ── Share buttons ──

function ShareButtons({
  commitmentId,
  commitmentText,
  stats,
  keepBuilding,
  copied,
  onCopyLink,
  onClose,
}: {
  commitmentId: Id<"commitments">;
  commitmentText: string;
  stats: ShipStats | null | undefined;
  keepBuilding: boolean;
  copied: boolean;
  onCopyLink: () => void;
  onClose: () => void;
}) {
  const shareUrl = `${window.location.origin}/s/${commitmentId}`;
  const daysText = stats ? `${stats.daysBuilding}d` : "";
  const commitsText = stats ? `${stats.totalCommits} commits` : "";
  const statsText = stats ? ` (${daysText}, ${commitsText})` : "";
  const prefix = keepBuilding ? "shipped" : "released";
  const shareText = `${prefix}: ${commitmentText}${statsText}`;

  function openPopup(url: string) {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <Button variant="secondary" size="sm" onClick={onCopyLink}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "copied" : "link"}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          openPopup(
            `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          )
        }
      >
        <ShareIcon d={ICON.x} />
        share
      </Button>
      {canNativeShare && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void navigator.share({ title: shareText, url: shareUrl }).catch(() => {})}
        >
          <ShareIcon d={ICON.share} />
          more
        </Button>
      )}
      <Button variant="ship" size="sm" onClick={onClose}>
        view commitment
      </Button>
    </div>
  );
}
