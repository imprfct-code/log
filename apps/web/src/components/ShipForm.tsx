import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShipForm({ commitmentId }: { commitmentId: Id<"commitments"> }) {
  const ship = useMutation(api.commitments.ship);

  const [url, setUrl] = useState("");
  const [keepBuilding, setKeepBuilding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(raw: string): string | null {
    try {
      new URL(raw.startsWith("http") ? raw : "https://" + raw);
      return null;
    } catch {
      return "invalid url";
    }
  }

  async function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) return;

    const validationError = validate(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const shipUrl = trimmed.replace(/^https?:\/\//, "");
      await ship({ id: commitmentId, shipUrl, keepBuilding });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to ship");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center border-b border-border-strong transition-colors focus-within:border-shipped">
          <input
            value={url}
            onChange={(e) => {
              setError(null);
              setUrl(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="https://..."
            autoFocus
            autoComplete="off"
            className="w-full bg-transparent py-2 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button
          variant="ship"
          size="sm"
          disabled={!url.trim() || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "..." : "ship it"}
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px]">
        <button
          type="button"
          onClick={() => setKeepBuilding(true)}
          className={cn(
            "cursor-pointer border-b bg-transparent pb-0.5 font-mono transition-colors",
            keepBuilding
              ? "border-accent text-foreground-bright"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          keep building
        </button>
        <button
          type="button"
          onClick={() => setKeepBuilding(false)}
          className={cn(
            "cursor-pointer border-b bg-transparent pb-0.5 font-mono transition-colors",
            !keepBuilding
              ? "border-shipped text-shipped"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          done
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
