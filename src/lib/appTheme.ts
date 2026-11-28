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

export type ThemePattern = "none" | string;

export const THEME_PATTERNS: { id: string; label: string; image: string }[] = [
  { id: "none", label: "Clean", image: "" },
  { id: "citynight", label: "City Night", image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1600&auto=format&fit=crop" },
  { id: "neoncity", label: "Neon City", image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1600&auto=format&fit=crop" },
  { id: "beach", label: "Beach", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop" },
  { id: "mountains", label: "Mountains", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop" },
  { id: "sunset", label: "Sunset", image: "https://images.unsplash.com/photo-1472120435266-53107fd0c44a?q=80&w=1600&auto=format&fit=crop" },
  { id: "forest", label: "Forest", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop" },
  { id: "desert", label: "Desert", image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1600&auto=format&fit=crop" },
  { id: "ocean", label: "Ocean", image: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1600&auto=format&fit=crop" },
  { id: "space", label: "Space", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1600&auto=format&fit=crop" },
  { id: "stars", label: "Stars", image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1600&auto=format&fit=crop" },
  { id: "aurora", label: "Aurora", image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1600&auto=format&fit=crop" },
  { id: "clouds", label: "Clouds", image: "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?q=80&w=1600&auto=format&fit=crop" },
  { id: "storm", label: "Storm", image: "https://images.unsplash.com/photo-1500673922987-e212871fec22?q=80&w=1600&auto=format&fit=crop" },
  { id: "waterfall", label: "Waterfall", image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1600&auto=format&fit=crop" },
  { id: "lake", label: "Lake", image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=1600&auto=format&fit=crop" },
  { id: "canyon", label: "Canyon", image: "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?q=80&w=1600&auto=format&fit=crop" },
  { id: "road", label: "Open Road", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1600&auto=format&fit=crop" },
  { id: "bridge", label: "Bridge", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1600&auto=format&fit=crop" },
  { id: "skyline", label: "Skyline", image: "https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=1600&auto=format&fit=crop" },
  { id: "tokyo", label: "Tokyo", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1600&auto=format&fit=crop" },
  { id: "newyork", label: "New York", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1600&auto=format&fit=crop" },
  { id: "london", label: "London", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1600&auto=format&fit=crop" },
  { id: "dubai", label: "Dubai", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1600&auto=format&fit=crop" },
  { id: "paris", label: "Paris", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1600&auto=format&fit=crop" },
  { id: "rome", label: "Rome", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1600&auto=format&fit=crop" },
  { id: "santorini", label: "Santorini", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1600&auto=format&fit=crop" },
  { id: "bali", label: "Bali", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1600&auto=format&fit=crop" },
  { id: "maldives", label: "Maldives", image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1600&auto=format&fit=crop" },
  { id: "iceland", label: "Iceland", image: "https://images.unsplash.com/photo-1476610182048-b716b8518aae?q=80&w=1600&auto=format&fit=crop" },
  { id: "alps", label: "Alps", image: "https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?q=80&w=1600&auto=format&fit=crop" },
  { id: "autumn", label: "Autumn", image: "https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?q=80&w=1600&auto=format&fit=crop" },
  { id: "winter", label: "Winter", image: "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=1600&auto=format&fit=crop" },
  { id: "spring", label: "Spring", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1600&auto=format&fit=crop" },
  { id: "rain", label: "Rain", image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1600&auto=format&fit=crop" },
  { id: "fog", label: "Fog", image: "https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?q=80&w=1600&auto=format&fit=crop" },
  { id: "sunrise", label: "Sunrise", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1600&auto=format&fit=crop" },
  { id: "moon", label: "Moon", image: "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?q=80&w=1600&auto=format&fit=crop" },
  { id: "galaxy", label: "Galaxy", image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1600&auto=format&fit=crop" },
  { id: "nebula", label: "Nebula", image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1600&auto=format&fit=crop" },
  { id: "volcano", label: "Volcano", image: "https://images.unsplash.com/photo-1462332420958-a05d1e002413?q=80&w=1600&auto=format&fit=crop" },
  { id: "cliffs", label: "Cliffs", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop" },
  { id: "dunes", label: "Dunes", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop" },
  { id: "jungle", label: "Jungle", image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1600&auto=format&fit=crop" },
  { id: "lavender", label: "Lavender", image: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?q=80&w=1600&auto=format&fit=crop" },
  { id: "cherryblossom", label: "Cherry Blossom", image: "https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=1600&auto=format&fit=crop" },
  { id: "roses", label: "Roses", image: "https://images.unsplash.com/photo-1496062031456-07b8f162a322?q=80&w=1600&auto=format&fit=crop" },
  { id: "palm", label: "Palm Trees", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop" },
  { id: "waves", label: "Waves", image: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=1600&auto=format&fit=crop" },
  { id: "underwater", label: "Underwater", image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1600&auto=format&fit=crop" },
  { id: "coral", label: "Coral Reef", image: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?q=80&w=1600&auto=format&fit=crop" },
  { id: "safari", label: "Safari", image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1600&auto=format&fit=crop" },
  { id: "horses", label: "Horses", image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=1600&auto=format&fit=crop" },
  { id: "wolf", label: "Wolf", image: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=1600&auto=format&fit=crop" },
  { id: "lion", label: "Lion", image: "https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?q=80&w=1600&auto=format&fit=crop" },
  { id: "eagle", label: "Eagle", image: "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?q=80&w=1600&auto=format&fit=crop" },
  { id: "cat", label: "Cat", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1600&auto=format&fit=crop" },
  { id: "dog", label: "Dog", image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=1600&auto=format&fit=crop" },
  { id: "car", label: "Sports Car", image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1600&auto=format&fit=crop" },
  { id: "motorcycle", label: "Motorcycle", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1600&auto=format&fit=crop" },
  { id: "supercar", label: "Supercar", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&auto=format&fit=crop" },
  { id: "vintage", label: "Vintage Car", image: "https://images.unsplash.com/photo-1459603677915-a62079ffd002?q=80&w=1600&auto=format&fit=crop" },
  { id: "sneakers", label: "Sneakers", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop" },
  { id: "fashion", label: "Fashion", image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1600&auto=format&fit=crop" },
  { id: "studio", label: "Studio", image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=1600&auto=format&fit=crop" },
  { id: "vinyl", label: "Vinyl", image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=1600&auto=format&fit=crop" },
  { id: "guitar", label: "Guitar", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1600&auto=format&fit=crop" },
  { id: "piano", label: "Piano", image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=1600&auto=format&fit=crop" },
  { id: "concert", label: "Concert", image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1600&auto=format&fit=crop" },
  { id: "dj", label: "DJ", image: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb1?q=80&w=1600&auto=format&fit=crop" },
  { id: "basketball", label: "Basketball", image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1600&auto=format&fit=crop" },
  { id: "football", label: "Football", image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600&auto=format&fit=crop" },
  { id: "boxing", label: "Boxing", image: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=1600&auto=format&fit=crop" },
  { id: "gym", label: "Gym", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1600&auto=format&fit=crop" },
  { id: "skate", label: "Skate", image: "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?q=80&w=1600&auto=format&fit=crop" },
  { id: "surf", label: "Surf", image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=1600&auto=format&fit=crop" },
  { id: "snowboard", label: "Snowboard", image: "https://images.unsplash.com/photo-1478700485868-972b69dc3fc4?q=80&w=1600&auto=format&fit=crop" },
  { id: "gaming", label: "Gaming", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop" },
  { id: "arcade", label: "Arcade", image: "https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=1600&auto=format&fit=crop" },
  { id: "tech", label: "Tech", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop" },
  { id: "code", label: "Code", image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1600&auto=format&fit=crop" },
  { id: "abstract1", label: "Abstract Red", image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1600&auto=format&fit=crop" },
  { id: "abstract2", label: "Abstract Dark", image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1600&auto=format&fit=crop" },
  { id: "abstract3", label: "Abstract Paint", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1600&auto=format&fit=crop" },
  { id: "abstract4", label: "Abstract Neon", image: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1600&auto=format&fit=crop" },
  { id: "smoke", label: "Smoke", image: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=1600&auto=format&fit=crop" },
  { id: "fire", label: "Fire", image: "https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?q=80&w=1600&auto=format&fit=crop" },
  { id: "lightning", label: "Lightning", image: "https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?q=80&w=1600&auto=format&fit=crop" },
  { id: "bokeh", label: "Bokeh", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1600&auto=format&fit=crop" },
  { id: "cinema", label: "Cinema", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop" },
  { id: "film", label: "Film Set", image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1600&auto=format&fit=crop" },
  { id: "camera", label: "Camera", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1600&auto=format&fit=crop" },
  { id: "books", label: "Books", image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1600&auto=format&fit=crop" },
  { id: "coffee", label: "Coffee", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop" },
  { id: "food", label: "Food", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop" },
  { id: "architecture", label: "Architecture", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1600&auto=format&fit=crop" },
  { id: "minimal", label: "Minimal", image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1600&auto=format&fit=crop" },
  { id: "darkmarble", label: "Dark Marble", image: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=1600&auto=format&fit=crop" },
  { id: "concrete", label: "Concrete", image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1600&auto=format&fit=crop" },
  { id: "luxury", label: "Luxury", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1600&auto=format&fit=crop" },
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
  const preset = THEME_PATTERNS.find((p) => p.id === pattern && p.image);
  if (preset?.image) {
    return { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.45)), url(${preset.image})`, backgroundSize: "cover", backgroundPosition: "center" };
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
