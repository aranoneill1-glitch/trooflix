"use client";

type Props = {
  size?: number;           // pixel size (default 16)
  className?: string;
};

/**
 * Trooflix verified badge — Instagram-style scalloped star, Trooflix red (#dc2626).
 * Renders inline SVG so it scales without quality loss.
 */
export default function VerifiedBadge({ size = 16, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-label="Verified"
      role="img"
    >
      {/* Scalloped 12-point star outline */}
      <path
        d="M12 1.5l1.6 2.05 2.6-.4 1.1 2.4 2.4 1.1-.4 2.6 2.05 1.6-2.05 1.6.4 2.6-2.4 1.1-1.1 2.4-2.6-.4L12 22.5l-1.6-2.05-2.6.4-1.1-2.4-2.4-1.1.4-2.6L2.65 12 4.7 10.4 4.3 7.8 6.7 6.7 7.8 4.3l2.6.4L12 1.5z"
        fill="#dc2626"
        stroke="#dc2626"
        strokeLinejoin="round"
      />
      {/* White check mark */}
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
