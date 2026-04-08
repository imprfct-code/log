/** Check if external links (GitHub repos, commits) should be accessible. */
export function canAccessExternalLink(isPrivate?: boolean, authorLinks?: boolean): boolean {
  return !isPrivate || !!authorLinks;
}
