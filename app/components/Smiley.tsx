// SalesBuddy mark — a refined coral smiley. Scales cleanly from favicon to
// the Slack app icon. Kept as a component so every placement stays identical.
export default function Smiley({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="#eb7360" />
      <circle cx="11.5" cy="13" r="1.9" fill="#ffffff" />
      <circle cx="20.5" cy="13" r="1.9" fill="#ffffff" />
      <path
        d="M10.5 18.5 Q16 23.7 21.5 18.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
