import type { Doc } from "./_generated/dataModel";

interface PrivacyContext {
  isPrivate?: boolean;
  ownerPrefs?: Pick<
    Doc<"users">,
    "privateShowMessages" | "privateShowHashes" | "privateShowBranches"
  >;
  isAuthor: boolean;
}

interface VisibilityFlags {
  showMessages: boolean;
  showHashes: boolean;
  showBranches: boolean;
}

/** Compute visibility flags for devlog entries based on privacy settings. */
export function computeVisibility({
  isPrivate,
  ownerPrefs,
  isAuthor,
}: PrivacyContext): VisibilityFlags {
  return {
    showMessages: isAuthor || !isPrivate || (ownerPrefs?.privateShowMessages ?? true),
    showHashes: isAuthor || !isPrivate || (ownerPrefs?.privateShowHashes ?? false),
    showBranches: isAuthor || !isPrivate || (ownerPrefs?.privateShowBranches ?? false),
  };
}

/** Redact sensitive fields from a devlog entry based on visibility flags. */
export function redactEntry<
  T extends {
    type: string;
    text: string;
    body?: string;
    hash?: string;
    gitBranch?: string;
    gitUrl?: string;
    gitAuthor?: string;
  },
>(entry: T, flags: VisibilityFlags, isPrivate?: boolean, isAuthor?: boolean): T {
  // Posts are never redacted — only commits
  if (entry.type === "post") return entry;

  return {
    ...entry,
    text: flags.showMessages ? entry.text : "private commit",
    body: flags.showMessages ? entry.body : undefined,
    hash: flags.showHashes ? entry.hash : undefined,
    gitBranch: flags.showBranches ? entry.gitBranch : undefined,
    gitUrl: isAuthor || !isPrivate ? entry.gitUrl : undefined,
    gitAuthor: isAuthor || !isPrivate ? entry.gitAuthor : undefined,
  };
}
