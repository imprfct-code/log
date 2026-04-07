import { describe, expect, test, vi } from "vite-plus/test";
import { mapGitHubCommits, type GitHubCommit } from "./githubApi";

function makeRawCommit(
  overrides: Partial<{
    sha: string;
    message: string;
    name: string;
    login: string;
    date: string;
    url: string;
    branch: string;
  }> = {},
): GitHubCommit & { _branch?: string } {
  return {
    sha: overrides.sha ?? "abc123",
    commit: {
      message: overrides.message ?? "fix: something",
      author: {
        name: overrides.name ?? "Test User",
        date: overrides.date ?? "2024-06-15T12:00:00Z",
      },
    },
    html_url: overrides.url ?? "https://github.com/owner/repo/commit/abc123",
    author:
      overrides.login !== undefined
        ? overrides.login
          ? { login: overrides.login }
          : null
        : { login: "testuser" },
    _branch: overrides.branch,
  };
}

describe("mapGitHubCommits", () => {
  test("maps basic commit fields correctly", () => {
    const result = mapGitHubCommits([
      makeRawCommit({
        sha: "deadbeef",
        message: "feat: add login",
        name: "Alice",
        date: "2024-06-15T10:00:00Z",
        url: "https://github.com/o/r/commit/deadbeef",
      }),
    ]);

    expect(result).toEqual([
      {
        sha: "deadbeef",
        message: "feat: add login",
        author: "Alice",
        url: "https://github.com/o/r/commit/deadbeef",
        timestamp: new Date("2024-06-15T10:00:00Z").getTime(),
        branch: undefined,
      },
    ]);
  });

  test("truncates message to first line", () => {
    const result = mapGitHubCommits([
      makeRawCommit({ message: "first line\nsecond line\nthird line" }),
    ]);

    expect(result[0].message).toBe("first line");
  });

  test("falls back to login when name is missing", () => {
    const commit: GitHubCommit & { _branch?: string } = {
      sha: "abc",
      commit: { message: "test", author: null },
      html_url: "https://github.com/o/r/commit/abc",
      author: { login: "ghuser" },
    };

    const result = mapGitHubCommits([commit]);
    expect(result[0].author).toBe("ghuser");
  });

  test("falls back to 'unknown' when both name and login are missing", () => {
    const commit: GitHubCommit & { _branch?: string } = {
      sha: "abc",
      commit: { message: "test", author: null },
      html_url: "https://github.com/o/r/commit/abc",
      author: null,
    };

    const result = mapGitHubCommits([commit]);
    expect(result[0].author).toBe("unknown");
  });

  test("uses _branch field from commit", () => {
    const result = mapGitHubCommits([makeRawCommit({ branch: "feature/login" })]);
    expect(result[0].branch).toBe("feature/login");
  });

  test("uses explicit branch parameter when _branch is not set", () => {
    const result = mapGitHubCommits([makeRawCommit()], "main");
    expect(result[0].branch).toBe("main");
  });

  test("_branch on commit takes priority over branch parameter", () => {
    const result = mapGitHubCommits([makeRawCommit({ branch: "develop" })], "main");
    expect(result[0].branch).toBe("develop");
  });

  test("falls back to Date.now() when author date is null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const commit: GitHubCommit & { _branch?: string } = {
      sha: "abc",
      commit: { message: "test", author: null },
      html_url: "https://github.com/o/r/commit/abc",
      author: null,
    };

    const result = mapGitHubCommits([commit]);
    expect(result[0].timestamp).toBe(new Date("2024-01-01T00:00:00Z").getTime());

    vi.useRealTimers();
  });

  test("maps multiple commits preserving order", () => {
    const result = mapGitHubCommits([
      makeRawCommit({ sha: "aaa", message: "first" }),
      makeRawCommit({ sha: "bbb", message: "second" }),
      makeRawCommit({ sha: "ccc", message: "third" }),
    ]);

    expect(result.map((c) => c.sha)).toEqual(["aaa", "bbb", "ccc"]);
    expect(result.map((c) => c.message)).toEqual(["first", "second", "third"]);
  });
});
