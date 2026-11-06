"use client";

type TickVariant = "none" | "plus_red" | "creator_gold" | "red" | "gold";

type Props = {
  size?: number;
  className?: string;
  variant?: TickVariant;
};

/**
 * Trooflix verification badge — scalloped 12-point star.
 * - none         : renders nothing (Free users)
 * - plus_red     : frosted red glass (Plus tier, $3.99)
 * - creator_gold : premium gold with shine (Creator tier, $9.99)
 *
 * Legacy aliases "red" and "gold" are still supported for backward compatibility.
 */
export default function VerifiedBadge({ size = 16, className = "", variant = "none" }: Props) {
  // Legacy aliases
  const normalized =
    variant === "red" ? "plus_red" :
    variant === "gold" ? "creator_gold" :
    variant;

  if (normalized === "none") return null;

  const isGold = normalized === "creator_gold";
  const id = `badge-${normalized}-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-label={isGold ? "Creator" : "Plus"}
      role="img"
    >
      <defs>
        {isGold ? (
          <>
            <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </>
        ) : (
          <>
            <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff5a67" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* Scalloped star */}
      <path
        d="M12 1.5l1.6 2.05 2.6-.4 1.1 2.4 2.4 1.1-.4 2.6 2.05 1.6-2.05 1.6.4 2.6-2.4 1.1-1.1 2.4-2.6-.4L12 22.5l-1.6-2.05-2.6.4-1.1-2.4-2.4-1.1.4-2.6L2.65 12 4.7 10.4 4.3 7.8 6.7 6.7 7.8 4.3l2.6.4L12 1.5z"
        fill={`url(#${id}-grad)`}
        stroke={isGold ? "#a16207" : "#991b1b"}
        strokeWidth={isGold ? "0.5" : "0.75"}
        strokeLinejoin="round"
      />

      {/* Glass shine overlay */}
      <path
        d="M12 1.5l1.6 2.05 2.6-.4 1.1 2.4 2.4 1.1-.4 2.6 2.05 1.6-2.05 1.6.4 2.6-2.4 1.1-1.1 2.4-2.6-.4L12 22.5l-1.6-2.05-2.6.4-1.1-2.4-2.4-1.1.4-2.6L2.65 12 4.7 10.4 4.3 7.8 6.7 6.7 7.8 4.3l2.6.4L12 1.5z"
        fill={`url(#${id}-shine)`}
        opacity={isGold ? "0.5" : "0.65"}
      />

      {/* White check */}
      <path
        d="M8.2 12.3l2.5 2.5 5.2-5.2"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
