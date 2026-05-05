import { describe, expect, test } from "vite-plus/test";
import { stripGithubUrl, isValidRepoFormat } from "./github";

describe("stripGithubUrl", () => {
  test("strips https github URL", () => {
    expect(stripGithubUrl("https://github.com/owner/repo")).toBe("owner/repo");
  });

  test("strips https www github URL", () => {
    expect(stripGithubUrl("https://www.github.com/owner/repo")).toBe("owner/repo");
  });

  test("strips http github URL", () => {
    expect(stripGithubUrl("http://github.com/owner/repo")).toBe("owner/repo");
  });

  test("strips bare github.com prefix", () => {
    expect(stripGithubUrl("github.com/owner/repo")).toBe("owner/repo");
  });

  test("strips tree subpath", () => {
    expect(stripGithubUrl("https://github.com/owner/repo/tree/main/src")).toBe("owner/repo");
  });

  test("strips blob subpath", () => {
    expect(stripGithubUrl("https://github.com/owner/repo/blob/main/README.md")).toBe("owner/repo");
  });

  test("strips issues subpath", () => {
    expect(stripGithubUrl("https://github.com/owner/repo/issues/42")).toBe("owner/repo");
  });

  test("strips pull subpath", () => {
    expect(stripGithubUrl("https://github.com/owner/repo/pull/7")).toBe("owner/repo");
  });

  test("strips trailing slash", () => {
    expect(stripGithubUrl("https://github.com/owner/repo/")).toBe("owner/repo");
  });

  test("returns already clean owner/repo as-is", () => {
    expect(stripGithubUrl("owner/repo")).toBe("owner/repo");
  });

  test("handles repo with dots and hyphens", () => {
    expect(stripGithubUrl("https://github.com/my-org/my-repo.js")).toBe("my-org/my-repo.js");
  });
});

describe("isValidRepoFormat", () => {
  test("accepts owner/repo", () => {
    expect(isValidRepoFormat("owner/repo")).toBe(true);
  });

  test("accepts dots, hyphens, underscores", () => {
    expect(isValidRepoFormat("my-org/my_repo.js")).toBe(true);
  });

  test("rejects bare owner without slash", () => {
    expect(isValidRepoFormat("owner")).toBe(false);
  });

  test("rejects trailing slash", () => {
    expect(isValidRepoFormat("owner/")).toBe(false);
  });

  test("rejects extra segments", () => {
    expect(isValidRepoFormat("owner/repo/extra")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidRepoFormat("")).toBe(false);
  });

  test("rejects full URL", () => {
    expect(isValidRepoFormat("https://github.com/owner/repo")).toBe(false);
  });
});
