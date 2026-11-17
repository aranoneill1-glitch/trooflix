import { NextResponse } from "next/server";

// Neutral fallback poster. Deliberately dark and text-free so a video without a
// generated thumbnail never shows a loud "red card" on the homepage.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wide = searchParams.get("size") === "wide";
  const W = wide ? 1280 : 400;
  const H = wide ? 720 : 600;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#17171d"/>
      <stop offset="55%" stop-color="#0d0d12"/>
      <stop offset="100%" stop-color="#050507"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Centered play glyph -->
  <g transform="translate(${W / 2}, ${H / 2})" opacity="0.32">
    <circle r="${Math.min(W, H) * 0.11}" fill="none" stroke="#ffffff" stroke-width="2"/>
    <path d="M ${-Math.min(W, H) * 0.026} ${-Math.min(W, H) * 0.044} L ${Math.min(W, H) * 0.05} 0 L ${-Math.min(W, H) * 0.026} ${Math.min(W, H) * 0.044} Z" fill="#ffffff"/>
  </g>

  <text x="${W / 2}" y="${H - 34}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="800" letter-spacing="5" fill="#ffffff" opacity="0.28">TROOFLIX</text>

  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.5"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
