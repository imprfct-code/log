/** Strip title portion and inline media refs from body for feed preview.
 *  Multi-line: strips first line. Single-line: strips first sentence (B2). */
export function stripBodyForPreview(body: string): string {
  const firstNewline = body.indexOf("\n");

  if (firstNewline >= 0) {
    // Multi-line: strip first line (existing behavior)
    return body
      .slice(firstNewline + 1)
      .replace(/!\[[^\]]*?\]\([^)]+\)\n?/g, "")
      .trim();
  }

  // Single-line long: try sentence split (B2)
  if (body.length > 100) {
    const sentenceEnd = body.search(/[.!?]\s/);
    if (sentenceEnd >= 20 && sentenceEnd < 100) {
      return body
        .slice(sentenceEnd + 2)
        .replace(/!\[[^\]]*?\]\([^)]+\)\n?/g, "")
        .trim();
    }
  }

  // Short or no sentence boundary → no body preview
  return "";
}

/** Returns true when a long single-line post has no good title/body split (B1 mode). */
export function needsUnifiedDisplay(body: string | undefined): boolean {
  if (!body || body.length <= 100 || body.includes("\n")) return false;
  const sentenceEnd = body.search(/[.!?]\s/);
  return sentenceEnd < 20 || sentenceEnd >= 100;
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

/** Strip title portion for detail view, keep other media refs.
 *  Multi-line: strips first line. Single-line long: returns full content (no separate title). */
export function computeDetailBody(body: string | undefined, coverKey?: string): string | undefined {
  if (!body) return undefined;

  let clean: string;
  const firstNewline = body.indexOf("\n");

  if (firstNewline >= 0) {
    // Multi-line: strip first line (title)
    clean = body.slice(firstNewline + 1).trim();
  } else if (body.length > 100) {
    // Single-line long: strip first sentence if there's a good split (B2)
    const sentenceEnd = body.search(/[.!?]\s/);
    if (sentenceEnd >= 20 && sentenceEnd < 100) {
      clean = body.slice(sentenceEnd + 2).trim();
    } else {
      // No good sentence boundary (B1): return full content
      clean = body;
    }
  } else {
    // Short single-line: everything is the title, no body
    return undefined;
  }

  if (coverKey) {
    const escaped = escapeRegexKey(coverKey);
    clean = clean.replace(new RegExp(`!\\[[^\\]]*?\\]\\(upload:${escaped}\\)\\n?`, "g"), "").trim();
  }
  return clean || undefined;
}
