"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Info, ChevronRight, X, Menu } from "lucide-react";
import BitChutePlayer from "@/components/BitChutePlayer";
import VideoPlayer from "@/components/VideoPlayer";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  featured: boolean;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  duration: string;
};

const CATEGORIES: string[] = [
  "History Revisionism",
  "Politics and Power",
  "True Crime",
  "Health and Science",
  "Technology and Control",
  "Religion and Belief",
  "Ancient Civilisations",
  "UFO Phenomena",
];

export default function TVPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch videos
  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((d) => {
        setVideos(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // D-pad navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (playing) return;

      // If detail modal is open, handle back
      if (selected) {
        if (e.key === "Escape" || e.key === "BrowserBack") {
          e.preventDefault();
          setSelected(null);
        }
        return;
      }

      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>("[data-tv-item]")
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      const current = document.querySelector<HTMLElement>("[data-tv-item].is-focused");
      const dirMap: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const dir = dirMap[e.key];

      // Close menu on back
      if (e.key === "Escape" || e.key === "BrowserBack") {
        if (menuOpen) {
          e.preventDefault();
          setMenuOpen(false);
          return;
        }
      }

      if (dir) {
        e.preventDefault();
        if (!current) {
          if (focusables.length > 0) {
            focusables[0].classList.add("is-focused");
            focusables[0].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
          return;
        }

        const curRect = current.getBoundingClientRect();
        const cx = curRect.left + curRect.width / 2;
        const cy = curRect.top + curRect.height / 2;

        let best: HTMLElement | null = null;
        let bestScore = Infinity;

        for (const el of focusables) {
          if (el === current) continue;
          const r = el.getBoundingClientRect();
          const ex = r.left + r.width / 2;
          const ey = r.top + r.height / 2;
          const dx = ex - cx;
          const dy = ey - cy;

          const passes =
            (dir === "right" && dx > 5) ||
            (dir === "left" && dx < -5) ||
            (dir === "down" && dy > 5) ||
            (dir === "up" && dy < -5);
          if (!passes) continue;

          const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
          const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
          const score = primary + secondary * 3;
          if (score < bestScore) {
            bestScore = score;
            best = el;
          }
        }

        if (best) {
          current.classList.remove("is-focused");
          best.classList.add("is-focused");
          best.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
        return;
      }

      if (e.key === "Enter" && current) {
        e.preventDefault();
        current.click();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, selected, menuOpen]);

  // Auto-focus first item
  useEffect(() => {
    if (loading || videos.length === 0) return;
    setTimeout(() => {
      const first = document.querySelector<HTMLElement>("[data-tv-item]");
      first?.classList.add("is-focused");
    }, 500);
  }, [loading, videos.length, activeCategory, menuOpen]);

  const hero = videos.find((v) => v.featured) || videos[0];

  const rows = (() => {
    if (activeCategory === "__MOVIES__") {
      return [{ title: "Movies", items: videos.filter((v) => v.type === "Movie") }];
    }
    if (activeCategory === "__DOCS__") {
      return [{ title: "Documentaries", items: videos.filter((v) => v.type === "Documentary") }];
    }
    if (activeCategory === "__PODCASTS__") {
      return [{ title: "Podcasts", items: videos.filter((v) => v.type === "Podcast") }];
    }
    if (activeCategory) {
      return [
        {
          title: activeCategory,
          items: videos.filter((v) => v.category === activeCategory),
        },
      ];
    }
    return CATEGORIES.map((cat) => ({
      title: cat,
      items: videos.filter((v) => v.category === cat),
    })).filter((r) => r.items.length > 0);
  })();

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <style jsx global>{`
        [data-tv-item] {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        [data-tv-item].is-focused {
          transform: scale(1.06);
          box-shadow: 0 0 0 4px #dc2626, 0 0 30px rgba(220, 38, 38, 0.6);
          z-index: 40;
        }
        *:focus {
          outline: none !important;
        }
      `}</style>

      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center gap-6 px-8 py-4 bg-gradient-to-b from-black via-black/95 to-transparent relative">
        <button
          data-tv-item
          onClick={() => setMenuOpen(true)}
          className="text-white hover:text-red-500 transition"
        >
          <Menu size={32} />
        </button>
        <a href="/tv" className="text-3xl font-black tracking-tight">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </a>
        <div className="flex gap-8 absolute left-1/2 -translate-x-1/2">
          <button
            data-tv-item
            onClick={() => setActiveCategory("__MOVIES__")}
            className={`text-xl font-semibold transition ${
              activeCategory === "__MOVIES__" ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Movies
          </button>
          <button
            data-tv-item
            onClick={() => setActiveCategory("__DOCS__")}
            className={`text-xl font-semibold transition ${
              activeCategory === "__DOCS__" ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Documentaries
          </button>
          <button
            data-tv-item
            onClick={() => setActiveCategory("__PODCASTS__")}
            className={`text-xl font-semibold transition ${
              activeCategory === "__PODCASTS__" ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Podcasts
          </button>
        </div>
      </div>

      {/* Sidebar menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/70"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-0 left-0 h-full w-80 bg-black border-r border-white/10 pt-8 px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-2xl font-black tracking-tight">
                <span className="text-white">TROO</span>
                <span className="text-red-600">FLIX</span>
              </span>
              <button
                data-tv-item
                onClick={() => setMenuOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={28} />
              </button>
            </div>
            <p className="text-xs tracking-widest text-white/40 mb-4">EXPLORE</p>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  data-tv-item
                  onClick={() => {
                    setActiveCategory(cat === activeCategory ? null : cat);
                    setMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-3 rounded text-lg transition ${
                    activeCategory === cat
                      ? "text-red-500 bg-white/5"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      {!activeCategory && hero && (
        <section className="relative h-[60vh] w-full">
          <img
            src={hero.backdropUrl}
            alt={hero.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col justify-center h-full px-12 max-w-3xl pt-16">
            <p className="text-sm tracking-[0.4em] text-red-500 font-bold mb-4">
              TROOFLIX ORIGINAL
            </p>
            <h1 className="text-4xl font-black mb-4 leading-tight">{hero.title}</h1>
            <div className="flex items-center gap-4 text-lg mb-6">
              <span className="text-green-500 font-bold">{hero.match}% Match</span>
              <span>{hero.year}</span>
              <span className="border border-white/40 px-2 py-0.5 text-sm">{hero.rating}</span>
              <span className="text-white/60">{hero.type}</span>
            </div>
            <p className="text-lg text-white/90 mb-8 max-w-2xl leading-relaxed line-clamp-3">
              {hero.description}
            </p>
            <div className="flex gap-4">
              <button
                data-tv-item
                onClick={() => setPlaying(hero)}
                className="flex items-center gap-3 bg-white text-black font-bold px-8 py-3 rounded text-lg"
              >
                <Play size={22} fill="black" /> Play
              </button>
              <button
                data-tv-item
                onClick={() => setSelected(hero)}
                className="flex items-center gap-3 bg-white/20 backdrop-blur text-white font-bold px-8 py-3 rounded text-lg"
              >
                <Info size={22} /> More Info
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Rows */}
      <div className="relative z-10 pt-8 pb-24 space-y-10">
        {rows.map((row) => (
          <Row
            key={row.title}
            title={row.title}
            items={row.items}
            onSelect={setSelected}
            onPlay={setPlaying}
          />
        ))}
        {!loading && videos.length === 0 && (
          <div className="text-center py-20 text-white/50 text-xl">No videos yet</div>
        )}
        {loading && (
          <div className="text-center py-20 text-white/50 text-xl">Loading…</div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-5xl mx-auto my-8 bg-[#141418] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[50vh] w-full">
              <img
                src={selected.backdropUrl}
                alt={selected.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-[#141418]/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-10">
                <h2 className="text-4xl font-black mb-6">{selected.title}</h2>
                <div className="flex gap-4">
                  <button
                    data-tv-item
                    onClick={() => {
                      setPlaying(selected);
                      setSelected(null);
                    }}
                    className="flex items-center gap-3 bg-white text-black font-bold px-8 py-3 rounded text-lg"
                  >
                    <Play size={22} fill="black" /> Play
                  </button>
                  <button
                    data-tv-item
                    onClick={() => setSelected(null)}
                    className="flex items-center gap-3 bg-white/20 backdrop-blur text-white font-bold px-8 py-3 rounded text-lg"
                  >
                    <X size={22} /> Close
                  </button>
                </div>
              </div>
            </div>
            <div className="p-10">
              <div className="flex items-center gap-4 text-lg mb-4">
                <span className="text-green-500 font-bold">{selected.match}% Match</span>
                <span>{selected.year}</span>
                <span className="border border-white/40 px-2 py-0.5 text-sm">{selected.rating}</span>
              </div>
              <p className="text-lg text-white/90 leading-relaxed">{selected.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Players */}
      {playing && playing.bitchuteUrl.includes("bitchute.com") && (
        <BitChutePlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
      {playing && !playing.bitchuteUrl.includes("bitchute.com") && (
        <VideoPlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          videoId={playing.id}
          onClose={() => setPlaying(null)}
        />
      )}
    </main>
  );
}

function Row({
  title,
  items,
  onSelect,
  onPlay,
}: {
  title: string;
  items: Video[];
  onSelect: (v: Video) => void;
  onPlay: (v: Video) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <h2 className="text-2xl font-bold px-12 mb-3">{title}</h2>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-12 pb-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-tv-item
            onClick={() => onSelect(item)}
            className="relative flex-shrink-0 w-[220px] aspect-[2/3] rounded-lg overflow-hidden cursor-pointer bg-[#141418]"
          >
            <img
              src={item.posterUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
              <p className="text-sm font-bold leading-tight line-clamp-2">{item.title}</p>
              <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                <span className="text-green-500 font-bold">{item.match}%</span>
                <span>{item.year}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
