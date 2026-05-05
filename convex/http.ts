import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

interface WebhookPushPayload {
  ref?: string;
  repository?: { full_name?: string };
  commits?: Array<{
    id: string;
    message: string;
    author: { name: string; username?: string };
    url: string;
    timestamp: string;
  }>;
}

export async function verifyGitHubSignature(
  body: ArrayBuffer,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, body);
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

const http = httpRouter();

http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("GITHUB_WEBHOOK_SECRET not configured");
      return new Response("server error", { status: 500 });
    }

    const bodyBytes = await req.arrayBuffer();
    const signature = req.headers.get("X-Hub-Signature-256");
    const valid = await verifyGitHubSignature(bodyBytes, signature, webhookSecret);
    if (!valid) {
      console.error("GitHub webhook signature verification failed");
      return new Response("unauthorized", { status: 401 });
    }

    const event = req.headers.get("X-GitHub-Event");
    if (event === "ping") return new Response("pong", { status: 200 });
    if (event !== "push") return new Response("ignored", { status: 200 });

    let payload: WebhookPushPayload;
    try {
      payload = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
      return new Response("invalid json", { status: 400 });
    }

    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) return new Response("missing repo", { status: 400 });

    const commitments = await ctx.runQuery(internal.github.getCommitmentsByRepo, {
      repo: repoFullName,
    });
    if (commitments.length === 0) return new Response("no matching commitments", { status: 200 });

    const branch = payload.ref?.replace("refs/heads/", "") ?? undefined;
    const rawCommits = payload.commits ?? [];

    if (rawCommits.length === 0) {
      return new Response("no commits", { status: 200 });
    }

    const commits = rawCommits.map((c) => ({
      sha: c.id,
      message: c.message.split("\n")[0],
      author: c.author.name || c.author.username || "unknown",
      url: c.url,
      timestamp: new Date(c.timestamp).getTime(),
      branch,
    }));

    for (const commitment of commitments) {
      await ctx.runMutation(internal.github.insertGitCommits, {
        commitmentId: commitment._id,
        userId: commitment.userId,
        commits,
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
