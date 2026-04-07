export function stripGithubUrl(value: string): string {
  let cleaned = value
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(/^github\.com\//, "");
  cleaned = cleaned.replace(/\/(tree|blob|commits|issues|pull|releases|actions|settings)\/.*$/, "");
  cleaned = cleaned.replace(/\/$/, "");
  return cleaned;
}

export function isValidRepoFormat(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo);
}

export function commitUrl(repo: string, sha: string): string {
  return `https://github.com/${repo}/commit/${sha}`;
}
