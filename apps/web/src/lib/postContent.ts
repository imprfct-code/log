/** Strip the first line (title) and inline media refs from body for feed/detail preview. */
export function stripBodyForPreview(body: string): string {
  return body
    .replace(/^.*\n?/, "")
    .replace(/!\[[^\]]*?\]\([^)]+\)\n?/g, "")
    .trim();
}

/** Escape regex special chars in a string. */
function escapeRegexKey(key: string): string {
  return key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract width percent from `![...|50%](upload:KEY)` in body for a given attachment key. */
export function parseMediaWidth(body: string, key: string): number | null {
  const escaped = escapeRegexKey(key);
  const match = body.match(new RegExp(`!\\[([^\\]]*)\\]\\(upload:${escaped}\\)`));
  if (!match) return null;
  const altMatch = match[1].match(/\|(\d{1,3})%$/);
  if (!altMatch) return null;
  return Math.min(100, Math.max(10, Number(altMatch[1])));
}

/** Strip body for detail view: remove first line (title) and cover attachment reference, keep other media refs. */
export function computeDetailBody(body: string | undefined, coverKey?: string): string | undefined {
  if (!body) return undefined;
  // Strip first line (title) but keep inline media refs so MarkdownBody can render them
  let clean = body.replace(/^.*\n?/, "").trim();
  if (coverKey) {
    const escaped = escapeRegexKey(coverKey);
    clean = clean.replace(new RegExp(`!\\[[^\\]]*?\\]\\(upload:${escaped}\\)\\n?`, "g"), "").trim();
  }
  return clean || undefined;
}
