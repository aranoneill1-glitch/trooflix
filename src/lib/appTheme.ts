import type { CSSProperties } from "react";

export const DEFAULT_APP_THEME_COLOR = "#09090B";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number) {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function hslToHex(h: number, s: number, l: number) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export type ThemePattern = "none" | "grain" | "mesh" | "grid" | "dots" | "diagonal" | "chat" | "aurora" | "sunset" | "midnight" | "rose" | "ocean" | "ember" | "citynight" | "beach" | "mountains" | "neoncity";

export const THEME_PATTERNS: { id: ThemePattern; label: string }[] = [
  { id: "none", label: "Clean" },
  { id: "aurora", label: "Aurora" },
  { id: "sunset", label: "Sunset" },
  { id: "midnight", label: "Midnight" },
  { id: "rose", label: "Rose" },
  { id: "ocean", label: "Ocean" },
  { id: "ember", label: "Ember" },
  { id: "citynight", label: "City Night" },
  { id: "beach", label: "Beach" },
  { id: "mountains", label: "Mountains" },
  { id: "neoncity", label: "Neon City" },
  { id: "grain", label: "Grain" },
  { id: "mesh", label: "Mesh" },
  { id: "grid", label: "Grid" },
  { id: "dots", label: "Dots" },
  { id: "diagonal", label: "Diagonal" },
  { id: "chat", label: "Chat" },
];

export function parseThemeBackdrop(backdropUrl?: string | null): { color: string; pattern: ThemePattern } {
  if (!backdropUrl) return { color: DEFAULT_APP_THEME_COLOR, pattern: "none" };
  if (backdropUrl.startsWith("{")) {
    try {
      const p = JSON.parse(backdropUrl);
      if (p?.__trooflixTheme) {
        const color = extractThemeColor(p.color || DEFAULT_APP_THEME_COLOR);
        const pattern = THEME_PATTERNS.some(t => t.id === p.pattern) ? p.pattern as ThemePattern : "none";
        return { color, pattern };
      }
    } catch {}
  }
  return { color: extractThemeColor(backdropUrl), pattern: "none" };
}

export function extractThemeColor(backdropUrl?: string | null): string {
  if (!backdropUrl) return DEFAULT_APP_THEME_COLOR;
  if (backdropUrl.startsWith("{")) {
    try { const p = JSON.parse(backdropUrl); if (p?.color) return extractThemeColor(String(p.color)); } catch {}
  }
  const match = backdropUrl.match(/#(?:[0-9a-fA-F]{3,8})/);
  const hex = match ? match[0] : DEFAULT_APP_THEME_COLOR;
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : DEFAULT_APP_THEME_COLOR;
}

export function extractThemePattern(backdropUrl?: string | null): ThemePattern {
  return parseThemeBackdrop(backdropUrl).pattern;
}

export function isDefaultThemeColor(color: string) {
  return extractThemeColor(color).toLowerCase() === DEFAULT_APP_THEME_COLOR.toLowerCase();
}

export function getBackdropFromColor(color: string, pattern: ThemePattern = "none") {
  const c = extractThemeColor(color);
  if (isDefaultThemeColor(c) && pattern === "none") return "";
  if (pattern === "none") return `linear-gradient(to bottom, ${c}, #09090b)`;
  return JSON.stringify({ __trooflixTheme: true, v: 1, color: c, pattern });
}

export function getThemeBackdropStyle(backdropUrl?: string | null): CSSProperties {
  if (!backdropUrl) return { background: "#09090B" };
  if (backdropUrl.startsWith("http")) return { backgroundImage: `url(${backdropUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
  const { color, pattern } = parseThemeBackdrop(backdropUrl);
  const base = `linear-gradient(to bottom, ${color}, #09090b)`;
  if (pattern === "grain") {
    return { backgroundColor: color, backgroundImage: `${base}, radial-gradient(rgba(255,255,255,0.08) 0.7px, transparent 0.7px)`, backgroundSize: "auto, 4px 4px" };
  }
  if (pattern === "mesh") {
    return { backgroundColor: color, backgroundImage: `radial-gradient(at 20% 20%, ${color}cc 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(229,57,69,0.25) 0px, transparent 45%), radial-gradient(at 50% 80%, rgba(255,255,255,0.06) 0px, transparent 50%), linear-gradient(to bottom, ${color}, #09090b)` };
  }
  if (pattern === "grid") {
    return { backgroundColor: color, backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), ${base}`, backgroundSize: "28px 28px, 28px 28px, auto" };
  }
  if (pattern === "dots") {
    return { backgroundColor: color, backgroundImage: `radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), ${base}`, backgroundSize: "18px 18px, auto" };
  }
  if (pattern === "diagonal") {
    return { backgroundColor: color, backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px), ${base}` };
  }
  if (pattern === "aurora") {
    return { backgroundColor: "#071018", backgroundImage: `radial-gradient(at 15% 20%, rgba(0,255,170,0.28) 0px, transparent 45%), radial-gradient(at 80% 15%, rgba(88,101,242,0.32) 0px, transparent 45%), radial-gradient(at 60% 75%, rgba(229,57,69,0.18) 0px, transparent 45%), linear-gradient(180deg, #09121a 0%, #05070d 100%)` };
  }
  if (pattern === "sunset") {
    return { backgroundColor: "#1a0b10", backgroundImage: `radial-gradient(at 20% 10%, rgba(255,140,66,0.38) 0px, transparent 45%), radial-gradient(at 80% 20%, rgba(229,57,69,0.35) 0px, transparent 45%), radial-gradient(at 50% 90%, rgba(120,40,200,0.25) 0px, transparent 50%), linear-gradient(180deg, #2a0f14 0%, #09090b 100%)` };
  }
  if (pattern === "midnight") {
    return { backgroundColor: "#070714", backgroundImage: `radial-gradient(at 25% 20%, rgba(88,101,242,0.28) 0px, transparent 45%), radial-gradient(at 75% 70%, rgba(139,92,246,0.22) 0px, transparent 45%), radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(180deg, #0b0b1a 0%, #050508 100%)`, backgroundSize: "auto, auto, 26px 26px, auto" };
  }
  if (pattern === "rose") {
    return { backgroundColor: "#18080e", backgroundImage: `radial-gradient(at 20% 20%, rgba(255,105,180,0.25) 0px, transparent 45%), radial-gradient(at 80% 30%, rgba(229,57,69,0.28) 0px, transparent 45%), radial-gradient(at 50% 85%, rgba(255,255,255,0.05) 0px, transparent 45%), linear-gradient(180deg, #1d0a12 0%, #09090b 100%)` };
  }
  if (pattern === "ocean") {
    return { backgroundColor: "#06131a", backgroundImage: `radial-gradient(at 20% 15%, rgba(56,189,248,0.3) 0px, transparent 45%), radial-gradient(at 80% 25%, rgba(14,165,233,0.22) 0px, transparent 45%), radial-gradient(at 50% 85%, rgba(0,255,170,0.1) 0px, transparent 45%), linear-gradient(180deg, #081923 0%, #05090b 100%)` };
  }
  if (pattern === "ember") {
    return { backgroundColor: "#140806", backgroundImage: `radial-gradient(at 30% 15%, rgba(229,57,69,0.38) 0px, transparent 45%), radial-gradient(at 75% 30%, rgba(255,120,50,0.22) 0px, transparent 45%), radial-gradient(at 50% 90%, rgba(120,20,20,0.25) 0px, transparent 50%), linear-gradient(180deg, #1a0908 0%, #09090b 100%)` };
  }
  if (pattern === "citynight") {
    return { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55)), url(https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1600&auto=format&fit=crop)`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  if (pattern === "beach") {
    return { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop)`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  if (pattern === "mountains") {
    return { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.55)), url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop)`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  if (pattern === "neoncity") {
    return { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.55)), url(https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1600&auto=format&fit=crop)`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  if (pattern === "chat") {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'><g fill='none' stroke='rgba(255,255,255,0.055)' stroke-width='1.8'><rect x='18' y='20' width='34' height='22' rx='7'/><path d='M28 42l6-5' stroke-linecap='round'/><rect x='118' y='24' width='38' height='24' rx='8'/><path d='M132 48l5-5' stroke-linecap='round'/><circle cx='52' cy='92' r='10'/><path d='M47 92h10M52 87v10' stroke-linecap='round'/><rect x='108' y='102' width='30' height='20' rx='7'/><path d='M118 122l5-4' stroke-linecap='round'/><path d='M24 132l8-8 8 8-8 8z'/><circle cx='146' cy='148' r='6'/></g></svg>`;
    const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    return { backgroundColor: color, backgroundImage: `${uri}, ${base}`, backgroundSize: "180px 180px, auto" };
  }
  return { background: backdropUrl.startsWith("{") ? base : backdropUrl };
}

export function buildAppThemeVars(color: string) {
  const c = extractThemeColor(color);
  const rgb = hexToRgb(c) || { r: 9, g: 9, b: 11 };
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  // Create a dark theme tinted by the selected color.
  const hue = hsl.h;
  const sat = clamp(hsl.s, 8, 55);
  const bg = hslToHex(hue, clamp(sat, 10, 35), 5);
  const surface = hslToHex(hue, clamp(sat, 10, 30), 9);
  const surface2 = hslToHex(hue, clamp(sat, 10, 28), 13);
  const border = `hsla(${Math.round(hue)}, ${Math.round(clamp(sat, 10, 30))}%, 70%, 0.14)`;
  const accent = hslToHex(hue, clamp(Math.max(hsl.s, 45), 45, 85), clamp(Math.max(hsl.l, 45), 45, 58));
  return {
    "--app-bg": bg,
    "--app-surface": surface,
    "--app-surface-2": surface2,
    "--app-border": border,
    "--app-accent": accent,
    "--app-theme-color": c,
  } as Record<string, string>;
}

export function applyAppTheme(color?: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved = extractThemeColor(color || DEFAULT_APP_THEME_COLOR);
  if (isDefaultThemeColor(resolved)) {
    clearAppTheme();
    return;
  }
  const vars = buildAppThemeVars(resolved);
  root.dataset.appTheme = "custom";
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

export function clearAppTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  delete root.dataset.appTheme;
  ["--app-bg","--app-surface","--app-surface-2","--app-border","--app-accent","--app-theme-color"].forEach((k) => root.style.removeProperty(k));
}
