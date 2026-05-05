import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const BIO_MAX = 160;

export function InlineBio({ initialValue }: { initialValue?: string }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialValue ?? "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function startEditing() {
    setDraft(initialValue ?? "");
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === (initialValue ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ bio: trimmed });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save bio");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = draft.trim() !== (initialValue ?? "");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void save();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, BIO_MAX))}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={BIO_MAX}
          placeholder="what are you building?"
          className="w-full resize-none border border-border bg-transparent px-2 py-1.5 text-[13px] leading-relaxed text-muted-foreground outline-none focus:border-accent/50"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/40">
            {draft.length}/{BIO_MAX}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer bg-transparent text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            >
              cancel
            </button>
            <button
              type="button"
              disabled={saving || !isDirty}
              onClick={() => void save()}
              className="cursor-pointer bg-transparent text-[11px] text-accent transition-colors hover:text-accent/80 disabled:opacity-40"
            >
              {saving ? "saving..." : "save"}
            </button>
          </div>
        </div>
        {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
      </div>
    );
  }

  if (initialValue) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="mt-2 cursor-pointer bg-transparent text-left text-[13px] leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Edit bio"
      >
        {initialValue}
      </button>
    );
  }

  return (
    <button
      onClick={startEditing}
      className="mt-2 cursor-pointer bg-transparent text-[13px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
    >
      add a bio...
    </button>
  );
}
