export function LogIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32.5" cy="60" r="7" fill="rgba(255,255,255,0.25)" />
      <line x1="39.5" y1="60" x2="47.5" y2="60" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
      <circle cx="56" cy="60" r="8.5" fill="rgba(255,255,255,0.55)" />
      <line x1="64.5" y1="60" x2="72.5" y2="60" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
      <circle cx="83.5" cy="60" r="11" fill="rgba(255,255,255,0.92)" />
    </svg>
  );
}
