import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GhIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { stripGithubUrl, isValidRepoFormat } from "@/lib/github";

export function ConnectRepoForm({ commitmentId }: { commitmentId: Id<"commitments"> }) {
  const connectRepo = useMutation(api.commitments.connectRepo);

  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(value: string, strip = false) {
    setError(null);
    setRepo(strip ? stripGithubUrl(value) : value);
  }

  async function handleSubmit() {
    const trimmed = repo.trim();
    if (!trimmed) return;

    if (!isValidRepoFormat(trimmed)) {
      setError("invalid format — use owner/repo");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await connectRepo({ id: commitmentId, repo: trimmed });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect repo");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-0 border-b border-border-strong transition-colors focus-within:border-accent">
          <span className="flex items-center gap-1.5 py-2 pl-3 text-sm text-muted-foreground">
            <GhIcon size={13} color="#666" />
            github.com/
          </span>
          <input
            value={repo}
            onChange={(e) => handleChange(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted.includes("github.com/")) {
                e.preventDefault();
                handleChange(pasted, true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="user/repo"
            autoFocus
            autoComplete="off"
            className="w-full bg-transparent py-2 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button size="sm" disabled={!repo.trim() || submitting} onClick={() => void handleSubmit()}>
          {submitting ? "..." : "connect"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
