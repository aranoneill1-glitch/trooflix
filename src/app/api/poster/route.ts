import { NextResponse } from "next/server";

// Category → gradient color palette
const PALETTES: Record<string, { from: string; to: string; accent: string }> = {
  "History Revisionism":    { from: "#3d1f00", to: "#0b0b0f", accent: "#f59e0b" },
  "Politics and Power":     { from: "#1e1b4b", to: "#0b0b0f", accent: "#818cf8" },
  "True Crime":             { from: "#3b0a1e", to: "#0b0b0f", accent: "#f43f5e" },
  "Health and Science":     { from: "#042f2e", to: "#0b0b0f", accent: "#2dd4bf" },
  "Technology and Control": { from: "#082f49", to: "#0b0b0f", accent: "#38bdf8" },
  "Religion and Belief":    { from: "#2e1065", to: "#0b0b0f", accent: "#a78bfa" },
  "Ancient Civilisations":  { from: "#422006", to: "#0b0b0f", accent: "#eab308" },
  "Uncensored":             { from: "#450a0a", to: "#0b0b0f", accent: "#ef4444" },
};

function wrapTitle(title: string, maxChars = 16): string[] {
  const words = title.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 4); // max 4 lines
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Untitled";
  const category = searchParams.get("category") || "Uncensored";

  const palette = PALETTES[category] || PALETTES["Uncensored"];
  const lines = wrapTitle(title);

  const W = 400;
  const H = 600;
  const lineHeight = 48;
  const totalTextHeight = lines.length * lineHeight;
  const startY = H / 2 - totalTextHeight / 2 + lineHeight / 2;

  const titleTspans = lines
    .map((line, i) => `<tspan x="${W / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.from}"/>
      <stop offset="70%" stop-color="${palette.to}"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Diagonal accent line -->
  <line x1="0" y1="${H * 0.28}" x2="${W}" y2="${H * 0.18}" stroke="${palette.accent}" stroke-opacity="0.25" stroke-width="2"/>

  <!-- Top bar: category -->
  <text x="${W / 2}" y="60" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" letter-spacing="4" fill="${palette.accent}" font-weight="700">${escapeXml(category.toUpperCase())}</text>

  <!-- Title text -->
  <text x="${W / 2}" y="${startY}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="900" fill="#ffffff" letter-spacing="1">${titleTspans}</text>

  <!-- Divider under title -->
  <line x1="${W * 0.35}" y1="${startY + totalTextHeight / 2 + 30}" x2="${W * 0.65}" y2="${startY + totalTextHeight / 2 + 30}" stroke="${palette.accent}" stroke-width="2"/>

  <!-- Bottom bar: Trooflix branding -->
  <text x="${W / 2}" y="${H - 40}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="900" letter-spacing="3" fill="#ffffff" opacity="0.9">TROO<tspan fill="#dc2626">FLIX</tspan></text>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="9" letter-spacing="3" fill="#ffffff" opacity="0.4">UNCENSORED</text>

  <!-- Noise overlay for texture -->
  <rect width="${W}" height="${H}" filter="url(#noise)" opacity="0.4"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
}
