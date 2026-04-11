import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { X } from "lucide-react";

type Step = "reason" | "confirm";

/** Two-step modal: 1) optional reason, 2) type commitment name to confirm. */
export function AbandonModal({
  commitmentId,
  commitmentText,
  onClose,
}: {
  commitmentId: Id<"commitments">;
  commitmentText: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const abandon = useMutation(api.commitments.abandon);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isConfirmed = confirmation === commitmentText;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    contentRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  async function handleSubmit() {
    if (submitting || !isConfirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const normalizedReason = reason.trim() || undefined;
      await abandon({ id: commitmentId, reason: normalizedReason });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to abandon");
      setSubmitting(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Abandon commitment"
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

      <div ref={contentRef} tabIndex={-1} className="w-full max-w-[420px] px-6 outline-none">
        {step === "reason" ? (
          <ReasonStep
            commitmentText={commitmentText}
            reason={reason}
            onReasonChange={setReason}
            onContinue={() => setStep("confirm")}
            onClose={onClose}
          />
        ) : (
          <ConfirmStep
            commitmentText={commitmentText}
            confirmation={confirmation}
            onConfirmationChange={setConfirmation}
            isConfirmed={isConfirmed}
            submitting={submitting}
            error={error}
            onBack={() => {
              setConfirmation("");
              setStep("reason");
            }}
            onSubmit={() => void handleSubmit()}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function ReasonStep({
  commitmentText,
  reason,
  onReasonChange,
  onContinue,
  onClose,
}: {
  commitmentText: string;
  reason: string;
  onReasonChange: (v: string) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <div>
      <p className="mb-6 text-[13px] text-muted-foreground/60">abandon</p>

      <p className="mb-1 text-sm leading-relaxed text-foreground">
        are you sure you want to abandon &ldquo;
        <span className="text-foreground-bright">{commitmentText}</span>&rdquo;?
      </p>
      <p className="mb-6 text-[12px] text-muted-foreground">
        it will stay visible on your profile but disappear from the feed.
      </p>

      <div>
        <label htmlFor="abandon-reason" className="mb-1.5 block text-[11px] text-muted-foreground">
          reason <span className="text-muted-foreground/50">(optional)</span>
        </label>
        <div className="border-b border-border-strong transition-colors focus-within:border-foreground/30">
          <textarea
            id="abandon-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="what happened?"
            maxLength={500}
            rows={2}
            autoFocus
            className="w-full resize-none bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 [field-sizing:content]"
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer border-none bg-transparent font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="cursor-pointer border border-border-strong bg-transparent px-4 py-2 font-mono text-xs text-muted-foreground/60 transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          abandon
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({
  commitmentText,
  confirmation,
  onConfirmationChange,
  isConfirmed,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  commitmentText: string;
  confirmation: string;
  onConfirmationChange: (v: string) => void;
  isConfirmed: boolean;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <p className="mb-6 text-[13px] text-muted-foreground/60">confirm</p>

      <p className="mb-6 text-sm text-foreground">
        type <span className="text-foreground-bright">{commitmentText}</span> to confirm
      </p>

      <div className="border-b border-border-strong transition-colors focus-within:border-foreground/30">
        <input
          type="text"
          value={confirmation}
          onChange={(e) => onConfirmationChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isConfirmed) onSubmit();
          }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent px-1 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[11px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer border-none bg-transparent font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; back
        </button>
        <button
          type="button"
          disabled={!isConfirmed || submitting}
          onClick={onSubmit}
          className="cursor-pointer border border-border-strong bg-transparent px-4 py-2 font-mono text-xs text-muted-foreground/60 transition-colors enabled:hover:border-foreground/30 enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? "..." : "abandon"}
        </button>
      </div>
    </div>
  );
}
