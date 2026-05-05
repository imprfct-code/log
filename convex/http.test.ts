import { describe, expect, test } from "vite-plus/test";
import { verifyGitHubSignature } from "./http";

const SECRET = "test-webhook-secret";

async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

function toArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

describe("verifyGitHubSignature", () => {
  test("returns true for valid signature", async () => {
    const body = '{"action":"push"}';
    const signature = await sign(body, SECRET);

    const result = await verifyGitHubSignature(toArrayBuffer(body), signature, SECRET);
    expect(result).toBe(true);
  });

  test("returns false for null signature", async () => {
    const result = await verifyGitHubSignature(toArrayBuffer("{}"), null, SECRET);
    expect(result).toBe(false);
  });

  test("returns false for wrong signature", async () => {
    const body = '{"action":"push"}';
    const wrongSig = await sign("different body", SECRET);

    const result = await verifyGitHubSignature(toArrayBuffer(body), wrongSig, SECRET);
    expect(result).toBe(false);
  });

  test("returns false for wrong secret", async () => {
    const body = '{"action":"push"}';
    const signature = await sign(body, "wrong-secret");

    const result = await verifyGitHubSignature(toArrayBuffer(body), signature, SECRET);
    expect(result).toBe(false);
  });

  test("returns false for truncated signature", async () => {
    const body = '{"action":"push"}';
    const signature = await sign(body, SECRET);
    const truncated = signature.slice(0, -4);

    const result = await verifyGitHubSignature(toArrayBuffer(body), truncated, SECRET);
    expect(result).toBe(false);
  });

  test("returns false for garbage string", async () => {
    const result = await verifyGitHubSignature(toArrayBuffer("{}"), "not-a-real-signature", SECRET);
    expect(result).toBe(false);
  });

  test("handles empty body", async () => {
    const signature = await sign("", SECRET);

    const result = await verifyGitHubSignature(toArrayBuffer(""), signature, SECRET);
    expect(result).toBe(true);
  });
});
