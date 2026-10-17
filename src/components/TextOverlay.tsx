"use client";

export type FontStyle =
  | "classic"
  | "serif"
  | "mono"
  | "strong"
  | "neon"
  | "outline";

export type TextOverlay = {
  id: string;
  text: string;
  x: number;      // 0..1, fraction of video width
  y: number;      // 0..1, fraction of video height
  size: "sm" | "md" | "lg";
  color: string;  // hex
  font?: FontStyle;
};

const SIZE_MAP: Record<TextOverlay["size"], string> = {
  sm: "text-sm md:text-base",
  md: "text-lg md:text-xl",
  lg: "text-2xl md:text-3xl",
};

export function fontStyle(font?: FontStyle) {
  switch (font) {
    case "serif":
      return { fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 };
    case "mono":
      return { fontFamily: "'Courier New', monospace", fontWeight: 700 };
    case "strong":
      return { fontFamily: "Impact, 'Arial Black', sans-serif", fontWeight: 900, letterSpacing: "0.02em" };
    case "neon":
      return { fontFamily: "system-ui, sans-serif", fontWeight: 800, textShadow: "0 0 8px currentColor, 0 0 16px currentColor" };
    case "outline":
      return { fontFamily: "system-ui, sans-serif", fontWeight: 800, WebkitTextStroke: "2px white", color: "transparent" };
    case "classic":
    default:
      return { fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 700 };
  }
}

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

  const aspectRatio =
    videoWidth && videoHeight ? videoWidth / videoHeight : undefined;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{ aspectRatio }}
    >
      {overlays.map((o) => {
        const fs = fontStyle(o.font);
        return (
          <div
            key={o.id}
            className={`absolute whitespace-pre-wrap leading-tight ${SIZE_MAP[o.size] || SIZE_MAP.md}`}
            style={{
              left: `${o.x * 100}%`,
              top: `${o.y * 100}%`,
              transform: "translate(-50%, -50%)",
              color: o.color || "#ffffff",
              textShadow: "0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
              maxWidth: "90%",
              wordBreak: "break-word",
              ...fs,
            }}
          >
            {o.text}
          </div>
        );
      })}
    </div>
  );
}
