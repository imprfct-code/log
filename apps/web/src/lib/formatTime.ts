const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function daysSince(timestamp: number): number {
  return Math.max(1, Math.ceil((Date.now() - timestamp) / DAY));
}

export function formatShippedIn(shippedAt: number, createdAt: number): string {
  const elapsed = Math.max(0, shippedAt - createdAt);
  const days = Math.floor(elapsed / DAY);
  if (days === 0) return "< 1 day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}
