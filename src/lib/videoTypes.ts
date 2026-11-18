// Single source of truth for video classification.
// Existing videos keep their old `type` / `category` values; these helpers map
// them into the new main-type buckets so legacy content stays visible.

export type MainType = "podcast" | "documentary" | "film" | "live" | "short" | "other";

export const MAIN_TYPES: { id: MainType; label: string }[] = [
  { id: "podcast", label: "Podcasts" },
  { id: "documentary", label: "Documentaries" },
  { id: "film", label: "Films" },
  { id: "live", label: "Live" },
  { id: "other", label: "Other" },
  // Shorts live in the bottom nav, not in the homepage pills.
];

export const SUB_CATEGORIES = [
  "History",
  "Science & Technology",
  "Politics & Geopolitics",
  "War & Conflict",
  "True Crime & Justice",
  "Conspiracy & Mystery",
  "Society & Culture",
  "Business & Finance",
  "Environment & Nature",
  "Religion & Spirituality",
  "Ancient Civilisation",
  "Comedy",
  "News",
  "Gaming",
  "Medicine",
  "Independent Film",
  "Books",
];

export function normalizeMainType(v: any): MainType {
  const t = String(v?.type || "").toLowerCase().trim();
  if (v?.is_live || v?.isLive || v?.live) return "live";
  if (t === "podcast" || t === "podcasts") return "podcast";
  if (t === "documentary" || t === "documentaries") return "documentary";
  if (["film", "movie", "independent film", "series"].includes(t)) return "film";
  if (["short", "shorts", "reel", "reels", "tweet"].includes(t)) return "short";
  if (["live", "livestream", "live-stream"].includes(t)) return "live";
  return "other"; // long-video and anything else
}

export function mainTypeLabel(id: MainType): string {
  return MAIN_TYPES.find(t => t.id === id)?.label || "Other";
}
