export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  html_url: string;
  author: { login: string } | null;
}

export interface GitHubCommitWithBranch extends GitHubCommit {
  _branch?: string;
}

export async function fetchGitHubToken(clerkUserId: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  const res = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_github`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("Failed to fetch GitHub token from Clerk:", { status: res.status, body });
    return null;
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.error("Clerk returned no OAuth tokens for user:", { clerkUserId, data });
    return null;
  }
  return data[0].token ?? null;
}

export const githubApiHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/** Returns null if rate-limited, empty array on other errors. */
export async function fetchCommitPage(
  repo: string,
  token: string,
  page: number,
  opts?: { since?: string; sha?: string },
): Promise<GitHubCommit[] | null> {
  let url = `https://api.github.com/repos/${repo}/commits?per_page=100&page=${page}`;
  if (opts?.since) url += `&since=${opts.since}`;
  if (opts?.sha) url += `&sha=${opts.sha}`;

  const res = await fetch(url, { headers: githubApiHeaders(token) });

  if (res.status === 403 || res.status === 429) {
    const resetHeader = res.headers.get("X-RateLimit-Reset");
    console.error("GitHub rate limited", { repo, page, resetAt: resetHeader });
    return null;
  }

  if (!res.ok) {
    console.error("fetchCommitPage: failed", { repo, page, status: res.status });
    return [];
  }

  return await res.json();
}

/** Fetch all branch names for a repo. Throws on API failure. */
export async function fetchBranches(repo: string, token: string): Promise<string[]> {
  const branches: string[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/branches?per_page=100&page=${page}`,
      { headers: githubApiHeaders(token) },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `fetchBranches failed for ${repo} (page ${page}): ${res.status} ${res.statusText} ${body}`,
      );
    }
    const data: Array<{ name: string }> = await res.json();
    branches.push(...data.map((b) => b.name));
    if (data.length < 100) break;
    page++;
  }

  return branches;
}

/** Fetch new commits from all branches since a given time. Dedup by SHA. */
export async function fetchNewCommitsAllBranches(
  repo: string,
  token: string,
  since?: string,
): Promise<GitHubCommitWithBranch[]> {
  const seen = new Set<string>();
  const allCommits: GitHubCommitWithBranch[] = [];

  // Always check the default branch first (GitHub returns default branch when sha is omitted)
  const defaultPage = await fetchCommitPage(repo, token, 1, { since });
  if (defaultPage) {
    for (const c of defaultPage) {
      if (!seen.has(c.sha)) {
        seen.add(c.sha);
        allCommits.push(c);
      }
    }
  }

  // Check other branches
  let branches: string[] = [];
  try {
    branches = await fetchBranches(repo, token);
  } catch (err) {
    console.error("Failed to fetch branches, continuing with already-collected commits", {
      repo,
      err,
    });
  }

  for (const branch of branches) {
    const commits = await fetchCommitPage(repo, token, 1, { since, sha: branch });
    if (commits === null) break; // Rate limited — stop fetching
    for (const c of commits) {
      if (!seen.has(c.sha)) {
        seen.add(c.sha);
        allCommits.push({ ...c, _branch: branch });
      }
    }
  }

  return allCommits;
}

export function mapGitHubCommits(
  data: Array<GitHubCommit & { _branch?: string }>,
  branch?: string,
) {
  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message.split("\n")[0],
    author: c.commit.author?.name || c.author?.login || "unknown",
    url: c.html_url,
    timestamp: new Date(c.commit.author?.date ?? Date.now()).getTime(),
    branch: c._branch ?? branch,
  }));
}

/** Check if a webhook with our URL already exists on this repo (prevents duplicates on retry). */
export async function findExistingHook(
  repo: string,
  webhookUrl: string,
  headers: Record<string, string>,
): Promise<number | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/hooks`, { headers });
  if (!res.ok) return null;

  const hooks: Array<{ id: number; config: { url?: string } }> = await res.json();
  const match = hooks.find((h) => h.config.url === webhookUrl);
  return match?.id ?? null;
}

/** Check if a repository is private. Returns true on error (fail-closed). */
export async function isRepositoryPrivate(repo: string, token: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: githubApiHeaders(token),
  });

  if (!res.ok) {
    console.error("Failed to check repo privacy", { repo, status: res.status });
    return true;
  }

  const data: { private?: boolean } = await res.json();
  return data.private ?? false;
}

/** Verify the authenticated user has push access to a repo. Throws on failure (fail-closed). */
export async function verifyRepoAccess(repo: string, token: string): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: githubApiHeaders(token),
  });

  if (res.status === 404) {
    throw new Error("Repository not found or you don't have access");
  }
  if (!res.ok) {
    throw new Error("Could not verify repository access");
  }

  const data: { permissions?: { push?: boolean } } = await res.json();
  if (!data.permissions?.push) {
    throw new Error("You don't have write access to this repository");
  }
}
