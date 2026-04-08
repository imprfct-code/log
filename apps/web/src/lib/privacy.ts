/** Check if external links (GitHub repos, commits) should be accessible. */
export function canAccessExternalLink(isPrivate?: boolean, authorLinks?: boolean): boolean {
  return !isPrivate || !!authorLinks;
}

interface VisibilityFlags {
  showMessages: boolean;
  showHashes: boolean;
  showBranches: boolean;
}

interface PrivacyPreferences {
  privateShowMessages?: boolean;
  privateShowHashes?: boolean;
  privateShowBranches?: boolean;
}

/** Compute visibility flags for devlog entries based on privacy settings. */
export function computeVisibilityFlags(
  isPrivate?: boolean,
  userPreferences?: PrivacyPreferences,
  isAuthor?: boolean,
): VisibilityFlags {
  return {
    showMessages: isAuthor || !isPrivate || (userPreferences?.privateShowMessages ?? true),
    showHashes: isAuthor || !isPrivate || (userPreferences?.privateShowHashes ?? false),
    showBranches: isAuthor || !isPrivate || (userPreferences?.privateShowBranches ?? false),
  };
}
