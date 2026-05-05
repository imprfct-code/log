export default function BoostIcon({
  size = 12,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.3-2 3.5-2 3.5s2.2-.5 3.5-2c.7-.8.7-2-.2-2.7-.7-.5-1.7-.4-2.4.1" />
      <path d="M14.5 9.5 9 15l-3-3 5.5-5.5C14 4 18.5 2 21.5 2c0 3-.5 7.5-3 10" />
      <path d="M18 6a2 2 0 0 1-2 2" />
    </svg>
  );
}
