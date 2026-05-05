import type { VercelRequest, VercelResponse } from "@vercel/node";
import { convexQuery } from "./_lib/convex.js";
import type { CommitmentData, ShipStatsData } from "./_lib/convex.js";

/** Serve a share page with OG meta tags and HTML redirect to the commitment detail page. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.redirect(302, "/");
  }

  const host = req.headers.host ?? "log.imprfct.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  let title = "imprfct Log \u2014 Commit. Build. Ship.";
  let description = "A place to commit publicly, document the struggle, and ship.";
  let canonicalUrl = `${origin}/`;
  let ogImageUrl = `${origin}/api/og`;

  try {
    const [commitment, stats] = await Promise.all([
      convexQuery<CommitmentData | null>("commitments:getByIdForShare", { id }),
      convexQuery<ShipStatsData | null>("commitments:getShipStatsForShare", { id }),
    ]);

    if (commitment) {
      const isShipped = commitment.status === "shipped" || !!commitment.shipUrl;
      const username = commitment.user?.username ?? "builder";

      title = isShipped ? `released: ${commitment.text}` : `building: ${commitment.text}`;
      title += ` \u2014 @${username}`;

      const parts: string[] = [];
      if (stats) {
        parts.push(`${stats.daysBuilding} days`);
        parts.push(`${stats.totalCommits} commits`);
      }
      parts.push("imprfct Log");
      description = parts.join(" \u00b7 ");

      canonicalUrl = `${origin}/commitment/${id}`;
      ogImageUrl = `${origin}/api/og?id=${encodeURIComponent(id)}`;
    }
  } catch (err) {
    console.error("Failed to fetch commitment for share page:", err);
  }

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(ogImageUrl)}" />
  <meta property="og:url" content="${esc(canonicalUrl)}" />
  <meta property="og:site_name" content="imprfct Log" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImageUrl)}" />

  <!-- Redirect humans to the real page -->
  <meta http-equiv="refresh" content="0;url=${esc(canonicalUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${esc(canonicalUrl)}">${esc(canonicalUrl)}</a>...</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, max-age=3600");
  return res.send(html);
}
