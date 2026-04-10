/** Thin helper to call public Convex queries from Vercel API routes. */

function getConvexUrl(): string {
  const url = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!url) throw new Error("Missing CONVEX_URL or VITE_CONVEX_URL environment variable");
  return url;
}

const CONVEX_URL = getConvexUrl();

/** Call a public Convex query from a Vercel API route with a 5-second timeout. */
export async function convexQuery<T = unknown>(
  path: string,
  args: Record<string, unknown>,
): Promise<T> {
  const url = CONVEX_URL.replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${url}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args, format: "json" }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Convex query "${path}" failed: ${res.status}`);
    }
    const json = (await res.json()) as { status: string; value?: unknown; errorMessage?: string };
    if (json.status === "error") {
      throw new Error(json.errorMessage ?? "Convex query error");
    }
    return json.value as T;
  } finally {
    clearTimeout(timeout);
  }
}

export interface CommitmentData {
  _id: string;
  text: string;
  status: "building" | "shipped";
  shipUrl?: string;
  shipNote?: string;
  user: { username: string; avatarUrl?: string } | null;
}

/** Intentional subset of getShipStatsForShare — only the fields the OG/share routes need. */
export interface ShipStatsData {
  daysBuilding: number;
  totalCommits: number;
  totalPosts: number;
  totalUpdates: number;
}
