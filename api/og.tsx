import React from "react";
import { ImageResponse } from "@vercel/og";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { convexQuery } from "./_lib/convex.js";
import type { CommitmentData, ShipStatsData } from "./_lib/convex.js";

// ── Font (IBM Plex Mono — Geist Mono has ligature tables Satori can't parse) ──

// Warm-instance-only cache: survives across requests on the same Fluid Compute instance
// but is lost on cold starts (acceptable — fonts are small and Google Fonts is fast).
const fontCache: Record<number, ArrayBuffer> = {};

/** Fetch and cache IBM Plex Mono font from Google Fonts. */
async function loadFont(weight: 400 | 700): Promise<ArrayBuffer> {
  if (fontCache[weight]) return fontCache[weight];
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@${weight}`,
  ).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error(`Could not resolve font URL for weight ${weight}`);
  const data = await fetch(url).then((r) => r.arrayBuffer());
  fontCache[weight] = data;
  return data;
}

// ── Design tokens (from apps/web/src/index.css) ──

const T = {
  bg: "#0a0a0a",
  fg: "#e8e8e8",
  fgBright: "#ffffff",
  accent: "#c7787a", // rose — the actual brand color
  accentSoft: "rgba(199,120,122,0.25)",
  shipped: "#5cb870", // green — only for shipped status
  shippedSoft: "rgba(92,184,112,0.13)",
  muted: "#1a1a1a",
  mutedFg: "#666666",
  border: "#1a1a1a",
  borderStrong: "#2a2a2a",
} as const;

const FONT_NAME = "IBM Plex Mono";

/** Load and configure fonts for Satori OG image rendering. */
async function imageOptions() {
  const [regular, bold] = await Promise.all([loadFont(400), loadFont(700)]);
  return {
    width: 1200 as const,
    height: 630 as const,
    fonts: [
      { name: FONT_NAME, data: regular, weight: 400 as const, style: "normal" as const },
      { name: FONT_NAME, data: bold, weight: 700 as const, style: "normal" as const },
    ],
  };
}

// ── Helpers ──

/** Send an OG image with cache headers. */
function sendImage(
  res: import("@vercel/node").VercelResponse,
  image: ImageResponse,
  maxAge: number,
) {
  return image.arrayBuffer().then((ab) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", `public, s-maxage=${maxAge}, max-age=${maxAge}`);
    return res.send(Buffer.from(ab));
  });
}

/** ○—○—● logo rendered with flexbox circles. */
function LogoMark({ scale = 1 }: { scale?: number }) {
  const s = (n: number) => Math.round(n * scale);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: s(6) }}>
      <div
        style={{
          display: "flex",
          width: s(10),
          height: s(10),
          borderRadius: s(5),
          backgroundColor: "rgba(255,255,255,0.2)",
        }}
      />
      <div
        style={{
          display: "flex",
          width: s(12),
          height: s(2),
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          display: "flex",
          width: s(13),
          height: s(13),
          borderRadius: s(7),
          backgroundColor: "rgba(255,255,255,0.45)",
        }}
      />
      <div
        style={{
          display: "flex",
          width: s(12),
          height: s(2),
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          display: "flex",
          width: s(16),
          height: s(16),
          borderRadius: s(8),
          backgroundColor: "rgba(255,255,255,0.85)",
        }}
      />
    </div>
  );
}

// ── Default (generic branding — matches landing page) ──

type ImgOpts = Awaited<ReturnType<typeof imageOptions>>;

/** Render the default branding OG image. */
function renderDefault(opts: ImgOpts) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: T.bg,
        fontFamily: `"${FONT_NAME}", monospace`,
        position: "relative",
        overflow: "hidden",
        padding: "56px 88px",
      }}
    >
      {/* Accent orb — 1:1 from .landing-orb in index.css */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "65%",
          width: 600,
          height: 600,
          minWidth: 600,
          minHeight: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.accent} 0%, transparent 70%)`,
          opacity: 0.12,
          filter: "blur(100px)",
          transform: "translate(-50%, -50%)",
          display: "flex",
        }}
      />

      {/* Logo bar top-left */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <LogoMark scale={1.1} />
        <div style={{ display: "flex", fontSize: 14, fontWeight: 700, color: T.fgBright }}>
          imprfct Log
        </div>
      </div>

      {/* Headline — vertically centered, capped width so orb has room */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          maxWidth: 700,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 700,
            color: T.fgBright,
            lineHeight: 1.25,
            letterSpacing: -1,
          }}
        >
          Make a public commitment.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: -1,
          }}
        >
          <span style={{ color: T.fgBright }}>Your commits are the </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: -1,
          }}
        >
          <span style={{ color: T.accent, textShadow: `0 0 40px ${T.accentSoft}` }}>devlog</span>
          <span style={{ color: T.fgBright }}>.</span>
        </div>
      </div>

      {/* Subtext bottom-left */}
      <div style={{ display: "flex", fontSize: 15, color: T.mutedFg }}>
        GitHub commits → automatic devlog. No writing required.
      </div>
    </div>,
    opts,
  );
}

// ── Commitment-specific ──

/** Render a commitment-specific OG image with status, title, and stats. */
function renderCommitment(commitment: CommitmentData, stats: ShipStatsData | null, opts: ImgOpts) {
  const isShipped = commitment.status === "shipped" || !!commitment.shipUrl;
  const username = commitment.user?.username ?? "builder";
  const text = commitment.text.length > 60 ? commitment.text.slice(0, 57) + "..." : commitment.text;
  const statusColor = isShipped ? T.shipped : T.accent;
  const shipUrl = commitment.shipUrl?.replace(/^https?:\/\//, "");
  const daysLabel = stats
    ? `${stats.daysBuilding} ${stats.daysBuilding === 1 ? "day" : "days"}`
    : "";
  const commitsLabel = stats
    ? `${stats.totalCommits} ${stats.totalCommits === 1 ? "commit" : "commits"}`
    : "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: T.bg,
        fontFamily: `"${FONT_NAME}", monospace`,
        position: "relative",
        overflow: "hidden",
        padding: "56px 88px",
      }}
    >
      {/* Background orb */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "65%",
          width: 600,
          height: 600,
          minWidth: 600,
          minHeight: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.accent} 0%, transparent 70%)`,
          opacity: 0.12,
          filter: "blur(100px)",
          transform: "translate(-50%, -50%)",
          display: "flex",
        }}
      />

      {/* Logo bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <LogoMark scale={1.1} />
        <div style={{ display: "flex", fontSize: 14, fontWeight: 700, color: T.fgBright }}>
          imprfct Log
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          maxWidth: 850,
        }}
      >
        {/* Status line */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: statusColor,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: statusColor,
              textTransform: "uppercase" as const,
              letterSpacing: 3,
            }}
          >
            {isShipped ? "shipped" : "building"}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: T.fgBright,
            lineHeight: 1.15,
            letterSpacing: -2,
          }}
        >
          {text}
        </div>

        {/* Ship URL */}
        {shipUrl && (
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: statusColor,
              marginTop: 14,
            }}
          >
            {shipUrl}
          </div>
        )}

        {/* Username + stats on one line */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 18 }}>
          <div style={{ display: "flex", fontSize: 18, color: T.mutedFg }}>@{username}</div>
          {daysLabel && (
            <div style={{ display: "flex", fontSize: 18, color: T.mutedFg }}>
              {"\u00a0\u00a0\u00b7\u00a0\u00a0"}
              {daysLabel}
            </div>
          )}
          {commitsLabel && (
            <div style={{ display: "flex", fontSize: 18, color: T.mutedFg }}>
              {"\u00a0\u00a0\u00b7\u00a0\u00a0"}
              {commitsLabel}
            </div>
          )}
        </div>
      </div>
    </div>,
    opts,
  );
}

// ── Handler ──

/** Generate an OG image for a commitment by ID, or return default branding. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  if (!id) {
    try {
      const opts = await imageOptions();
      return sendImage(res, renderDefault(opts), 604800);
    } catch (err) {
      console.error("Font loading failed:", err);
      return res.status(500).send("Font loading failed");
    }
  }

  let opts: ImgOpts;
  try {
    opts = await imageOptions();
  } catch (err) {
    console.error("Font loading failed:", err);
    return res.status(500).send("Font loading failed");
  }

  try {
    const [commitment, stats] = await Promise.all([
      convexQuery<CommitmentData | null>("commitments:getByIdForShare", { id }),
      convexQuery<ShipStatsData | null>("commitments:getShipStatsForShare", { id }),
    ]);

    if (!commitment) {
      return sendImage(res, renderDefault(opts), 3600);
    }

    return sendImage(res, renderCommitment(commitment, stats, opts), 86400);
  } catch (err) {
    console.error("OG image generation failed:", err);
    return sendImage(res, renderDefault(opts), 60);
  }
}
