import { describe, expect, test } from "vite-plus/test";
import {
  stripBodyForPreview,
  parseMediaWidth,
  computeDetailBody,
  needsUnifiedDisplay,
} from "./postContent";

describe("stripBodyForPreview", () => {
  test("removes the first line", () => {
    expect(stripBodyForPreview("# Title\nBody text")).toBe("Body text");
  });

  test("removes inline media refs", () => {
    expect(stripBodyForPreview("Title\n![alt](upload:abc123)\nMore text")).toBe("More text");
  });

  test("returns empty for single-line body", () => {
    expect(stripBodyForPreview("Only a title")).toBe("");
  });

  test("trims whitespace", () => {
    expect(stripBodyForPreview("Title\n  spaced  \n")).toBe("spaced");
  });

  test("removes multiple media refs", () => {
    const body = "Title\n![a](upload:x)\ntext\n![b](http://img.png)";
    expect(stripBodyForPreview(body)).toBe("text");
  });

  test("B2: strips first sentence from single-line long content", () => {
    const body =
      "Built the new auth flow with GitHub OAuth. It handles token refresh and session persistence across tabs.";
    expect(stripBodyForPreview(body)).toBe(
      "It handles token refresh and session persistence across tabs.",
    );
  });

  test("returns empty for single-line long content without sentence boundary", () => {
    const body = "a".repeat(200);
    expect(stripBodyForPreview(body)).toBe("");
  });
});

describe("parseMediaWidth", () => {
  test("extracts width percent from alt text", () => {
    expect(parseMediaWidth("![screenshot|50%](upload:abc123)", "abc123")).toBe(50);
  });

  test("returns null when no width in alt", () => {
    expect(parseMediaWidth("![screenshot](upload:abc123)", "abc123")).toBeNull();
  });

  test("returns null when key not found", () => {
    expect(parseMediaWidth("![img|50%](upload:other)", "abc123")).toBeNull();
  });

  test("clamps to min 10%", () => {
    expect(parseMediaWidth("![img|5%](upload:k)", "k")).toBe(10);
  });

  test("clamps to max 100%", () => {
    expect(parseMediaWidth("![img|200%](upload:k)", "k")).toBe(100);
  });

  test("handles keys with regex special chars", () => {
    const key = "uploads/2024/file.(1).png";
    expect(parseMediaWidth(`![img|75%](upload:${key})`, key)).toBe(75);
  });
});

describe("computeDetailBody", () => {
  test("returns undefined for empty body", () => {
    expect(computeDetailBody(undefined)).toBeUndefined();
    expect(computeDetailBody("")).toBeUndefined();
  });

  test("strips title line", () => {
    expect(computeDetailBody("# Title\nParagraph")).toBe("Paragraph");
  });

  test("removes cover attachment reference", () => {
    const body = "Title\n![cover](upload:cover-key)\nBody text";
    expect(computeDetailBody(body, "cover-key")).toBe("Body text");
  });

  test("returns undefined when body is only title + cover", () => {
    const body = "Title\n![cover](upload:key)";
    expect(computeDetailBody(body, "key")).toBeUndefined();
  });

  test("works without coverKey", () => {
    expect(computeDetailBody("Title\nContent")).toBe("Content");
  });

  test("keeps non-cover inline images in body", () => {
    const body = "Title\n![img1](upload:key1)\n![img2](upload:key2)";
    expect(computeDetailBody(body, "key1")).toBe("![img2](upload:key2)");
  });

  test("keeps multiple non-cover images in body", () => {
    const body = "Title\n![a](upload:cover)\ntext\n![b](upload:second)\n![c](upload:third)";
    expect(computeDetailBody(body, "cover")).toBe("text\n![b](upload:second)\n![c](upload:third)");
  });

  test("B2: strips first sentence from single-line long content", () => {
    const body =
      "Shipped the new landing page today. The hero section now has animated gradients and a live demo embed plus social proof testimonials from beta users.";
    expect(computeDetailBody(body)).toBe(
      "The hero section now has animated gradients and a live demo embed plus social proof testimonials from beta users.",
    );
  });

  test("B1: returns full content for single-line long content without sentence", () => {
    const body = "a".repeat(200);
    expect(computeDetailBody(body)).toBe(body);
  });

  test("returns undefined for short single-line", () => {
    expect(computeDetailBody("Short post")).toBeUndefined();
  });
});

describe("needsUnifiedDisplay", () => {
  test("returns false for undefined/empty body", () => {
    expect(needsUnifiedDisplay(undefined)).toBe(false);
    expect(needsUnifiedDisplay("")).toBe(false);
  });

  test("returns false for short single-line", () => {
    expect(needsUnifiedDisplay("Short post")).toBe(false);
  });

  test("returns false for multi-line content", () => {
    expect(needsUnifiedDisplay("Title\n" + "a".repeat(200))).toBe(false);
  });

  test("returns true for long single-line without sentence boundary", () => {
    expect(needsUnifiedDisplay("a".repeat(200))).toBe(true);
  });

  test("returns false for long single-line with sentence boundary", () => {
    const body =
      "Built the new auth flow with OAuth. It handles refresh tokens and session persistence across tabs forever.";
    expect(needsUnifiedDisplay(body)).toBe(false);
  });
});
