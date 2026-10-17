"use client";

export type TextOverlay = {
  id: string;
  text: string;
  x: number;      // 0..1, fraction of video width
  y: number;      // 0..1, fraction of video height
  size: "sm" | "md" | "lg";
  color: string;  // hex
};

const SIZE_MAP: Record<TextOverlay["size"], string> = {
  sm: "text-xs md:text-sm",
  md: "text-sm md:text-base",
  lg: "text-base md:text-xl",
};

export default function TextOverlayRenderer({
  overlays,
  videoWidth,
  videoHeight,
}: {
  overlays: TextOverlay[] | undefined;
  videoWidth?: number;
  videoHeight?: number;
}) {
  if (!overlays || overlays.length === 0) return null;

  // If we know the video's actual dimensions, use them to compute the rendered
  // box aspect ratio. Otherwise, assume the container aspect (parent should
  // already be sized correctly).
  const aspectRatio =
    videoWidth && videoHeight ? videoWidth / videoHeight : undefined;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{ aspectRatio }}
    >
      {overlays.map((o) => (
        <div
          key={o.id}
          className={`absolute font-bold drop-shadow-lg whitespace-pre-wrap leading-tight ${SIZE_MAP[o.size] || SIZE_MAP.md}`}
          style={{
            left: `${o.x * 100}%`,
            top: `${o.y * 100}%`,
            transform: "translate(-50%, -50%)",
            color: o.color || "#ffffff",
            textShadow: "0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
            maxWidth: "90%",
            wordBreak: "break-word",
          }}
        >
          {o.text}
        </div>
      ))}
    </div>
  );
}
