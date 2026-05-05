import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RepoPickerInput } from "@/components/RepoPickerInput";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/convexError";

export function ConnectRepoForm({ commitmentId }: { commitmentId: Id<"commitments"> }) {
  const connectRepo = useAction(api.commitments.connectRepo);

  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = repo.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await connectRepo({ id: commitmentId, repo: trimmed });
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to connect repo"));
      setTimeout(() => setError(null), 5000);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <RepoPickerInput value={repo} onChange={setRepo} autoFocus />
        </div>
        <Button size="sm" disabled={!repo.trim() || submitting} onClick={() => void handleSubmit()}>
          {submitting ? "..." : "connect"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
