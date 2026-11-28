// Single source of truth for video classification.
// Existing videos keep their old `type` / `category` values; these helpers map
// them into the new main-type buckets so legacy content stays visible.

export type MainType = "podcast" | "documentary" | "film" | "live" | "short" | "other";

export type CategoryItem = {
  id: string;
  label: string;
  image: string;
  kind: "main" | "topic";
  mainType?: MainType; // set when kind === "main"
};

const IMG = (u: string) => `https://images.unsplash.com/${u}?q=80&w=600&auto=format&fit=crop`;

export const ALL_CATEGORIES: CategoryItem[] = [
  { id: "podcast", label: "Podcasts", image: IMG("photo-1478737270239-2f02b77fc618"), kind: "main", mainType: "podcast" },
  { id: "documentary", label: "Documentaries", image: IMG("photo-1478720568477-152d9b164e26"), kind: "main", mainType: "documentary" },
  { id: "film", label: "Films", image: IMG("photo-1489599849927-2ee91cede3ba"), kind: "main", mainType: "film" },
  { id: "short", label: "Shorts", image: IMG("photo-1516035069371-29a1b244cc32"), kind: "main", mainType: "short" },
  { id: "live", label: "Live", image: IMG("photo-1598488035139-bdbb2231ce04"), kind: "main", mainType: "live" },
  { id: "other", label: "Other", image: IMG("photo-1492724441997-5dc865305da7"), kind: "main", mainType: "other" },
  { id: "history", label: "History", image: IMG("photo-1461360370896-922624d12aa1"), kind: "topic" },
  { id: "news", label: "News", image: IMG("photo-1504711434969-e33886168f5c"), kind: "topic" },
  { id: "gaming", label: "Gaming", image: IMG("photo-1542751371-adc38448a05e"), kind: "topic" },
  { id: "entertainment", label: "Entertainment", image: IMG("photo-1603190287605-e6ade32fa852"), kind: "topic" },
  { id: "finance-crypto", label: "Finance & Crypto", image: IMG("photo-1621761191319-c6fb62004040"), kind: "topic" },
  { id: "music", label: "Music", image: IMG("photo-1511379938547-c1f69419868d"), kind: "topic" },
  { id: "sports", label: "Sports", image: IMG("photo-1461896836934-ffe607ba8211"), kind: "topic" },
  { id: "health-science", label: "Health & Science", image: IMG("photo-1532187863486-abf9dbad1b69"), kind: "topic" },
  { id: "vlogs", label: "Vlogs", image: IMG("photo-1524250502761-1ac6f2e30d43"), kind: "topic" },
  { id: "cooking", label: "Cooking", image: IMG("photo-1556911220-bff31c812dba"), kind: "topic" },
  { id: "viral", label: "Viral", image: IMG("photo-1611162617474-5b21e879e113"), kind: "topic" },
  { id: "technology", label: "Technology", image: IMG("photo-1518770660439-4636190af475"), kind: "topic" },
  { id: "travel", label: "Travel", image: IMG("photo-1476514525535-07fb3b4ae5f1"), kind: "topic" },
  { id: "automotive", label: "Automotive", image: IMG("photo-1492144534655-ae79c964c9d7"), kind: "topic" },
  { id: "howto", label: "How-To", image: IMG("photo-1581092160562-40aa08e78837"), kind: "topic" },
  { id: "politics", label: "Politics", image: IMG("photo-1529107386315-e1a2ed48a620"), kind: "topic" },
  { id: "gambling-slots", label: "Gambling & Slots", image: IMG("photo-1596838132731-3301c3fd4317"), kind: "topic" },
  { id: "faith-religion", label: "Faith & Religion", image: IMG("photo-1507692049790-de58290a4334"), kind: "topic" },
  { id: "education", label: "Education", image: IMG("photo-1503676260728-1c00da094a0b"), kind: "topic" },
  { id: "irl", label: "IRL", image: IMG("photo-1529156069898-49953e39b3ac"), kind: "topic" },
  { id: "books-reading", label: "Reading & Books", image: IMG("photo-1512820790803-83ca734da794"), kind: "topic" },
  { id: "comedy", label: "Comedy", image: IMG("photo-1527224857830-43a7acc85260"), kind: "topic" },
  { id: "wildlife", label: "Wildlife", image: IMG("photo-1474511320723-9a56873867b5"), kind: "topic" },
  { id: "animals", label: "Animals", image: IMG("photo-1548199973-03cce0bbc87b"), kind: "topic" },
  { id: "movies", label: "Movies", image: IMG("photo-1489599849927-2ee91cede3ba"), kind: "topic" },
  { id: "health-fitness", label: "Health & Fitness", image: IMG("photo-1517836357463-d25dfeac3438"), kind: "topic" },
  { id: "medicine", label: "Medicine", image: IMG("photo-1576091160399-112ba8d25d1d"), kind: "topic" },
  { id: "true-crime", label: "True Crime", image: IMG("photo-1453873531674-2151bcd01707"), kind: "topic" },
  { id: "business", label: "Business", image: IMG("photo-1507679799987-c73779587ccf"), kind: "topic" },
  { id: "nature", label: "Nature", image: IMG("photo-1472214103451-9374bd1c798e"), kind: "topic" },
  { id: "art-design", label: "Art & Design", image: IMG("photo-1513364776144-60967b0f800f"), kind: "topic" },
];

// Back-compat exports
export const MAIN_TYPES: { id: MainType; label: string }[] = ALL_CATEGORIES
  .filter(c => c.kind === "main")
  .map(c => ({ id: c.mainType!, label: c.label }));

export const SUB_CATEGORIES = ALL_CATEGORIES
  .filter(c => c.kind === "topic")
  .map(c => c.label);

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