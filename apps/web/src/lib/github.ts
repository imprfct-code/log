export function stripGithubUrl(value: string): string {
  let cleaned = value
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(/^github\.com\//, "");
  // Only remove GitHub URL paths if there's a trailing slash after the keyword
  cleaned = cleaned.replace(
    /^([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)\/(tree|blob|commits|issues|pull|releases|actions|settings)\/.*$/,
    "$1",
  );
  cleaned = cleaned.replace(/\/$/, "");
  return cleaned;
}

export function isValidRepoFormat(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo);
}
