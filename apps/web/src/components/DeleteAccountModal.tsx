import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAction } from "convex/react";
import { useClerk } from "@clerk/react";
import { useNavigate } from "react-router";
import { api } from "@convex/_generated/api";
import { X } from "lucide-react";

type Step = "warning" | "confirm";

/** Two-step modal: 1) warning about deletion, 2) type username to confirm. */
export function DeleteAccountModal({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("warning");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const deleteAccount = useAction(api.accountDeletion.deleteAccount);
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isConfirmed = confirmation === username;

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

  async function handleDelete() {
    if (submitting || !isConfirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await deleteAccount({});
      await signOut();
      void navigate("/", { state: { signOut: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
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
      aria-label="Delete account"
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
        {step === "warning" ? (
          <WarningStep onContinue={() => setStep("confirm")} onClose={onClose} />
        ) : (
          <ConfirmStep
            username={username}
            confirmation={confirmation}
            onConfirmationChange={setConfirmation}
            isConfirmed={isConfirmed}
            submitting={submitting}
            error={error}
            onBack={() => {
              setConfirmation("");
              setStep("warning");
            }}
            onSubmit={() => void handleDelete()}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

/** First step of deletion flow: explains consequences of account deletion. */
function WarningStep({ onContinue, onClose }: { onContinue: () => void; onClose: () => void }) {
  return (
    <div>
      <p className="mb-6 text-[13px] text-destructive/60">delete account</p>

      <p className="mb-4 text-sm text-foreground">
        This will <span className="font-semibold text-foreground-bright">permanently delete</span>{" "}
        your account and all associated data:
      </p>
      <ul className="mb-6 list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
        <li>Your profile and user record</li>
        <li>All commitments and devlog entries</li>
        <li>All comments and boosts</li>
        <li>All uploaded images and videos</li>
        <li>GitHub webhook registrations</li>
        <li>Your Clerk authentication account</li>
      </ul>
      <p className="mb-6 text-[12px] text-muted-foreground">
        This action is irreversible. You can export your data first from Settings.
      </p>

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
          className="cursor-pointer border border-destructive/30 bg-transparent px-4 py-2 font-mono text-xs text-destructive transition-colors hover:border-destructive hover:text-destructive"
        >
          continue
        </button>
      </div>
    </div>
  );
}

/** Second step of deletion flow: requires user to type username to confirm deletion. */
function ConfirmStep({
  username,
  confirmation,
  onConfirmationChange,
  isConfirmed,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  username: string;
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
      <p className="mb-6 text-[13px] text-destructive/60">confirm deletion</p>

      <p className="mb-6 text-sm text-foreground">
        type <span className="text-foreground-bright">{username}</span> to confirm
      </p>

      <div className="border-b border-border-strong transition-colors focus-within:border-destructive/50">
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
          className="cursor-pointer border border-destructive/30 bg-transparent px-4 py-2 font-mono text-xs text-destructive transition-colors enabled:hover:border-destructive disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? "deleting..." : "delete my account"}
        </button>
      </div>
    </div>
  );
}
