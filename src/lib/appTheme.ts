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

export function extractThemeColor(backdropUrl?: string | null): string {
  if (!backdropUrl) return DEFAULT_APP_THEME_COLOR;
  const match = backdropUrl.match(/#(?:[0-9a-fA-F]{3,8})/);
  const hex = match ? match[0] : DEFAULT_APP_THEME_COLOR;
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : DEFAULT_APP_THEME_COLOR;
}

export function isDefaultThemeColor(color: string) {
  return extractThemeColor(color).toLowerCase() === DEFAULT_APP_THEME_COLOR.toLowerCase();
}

export function getBackdropFromColor(color: string) {
  return isDefaultThemeColor(color) ? "" : `linear-gradient(to bottom, ${color}, #09090b)`;
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
