"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, ChevronRight, X, ArrowLeft } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((d) => {
        setVideos(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Keyboard/remote navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // If player or modal is open, let them handle it
      if (playing || selected) return;

      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>("[data-tv-item]")
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      const current = document.querySelector<HTMLElement>("[data-tv-item].is-focused");
      const currentIndex = current ? focusables.indexOf(current) : -1;

      const dirMap: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };

      const dir = dirMap[e.key];

      if (dir) {
        e.preventDefault();
        if (!current) {
          focusables[0]?.classList.add("is-focused");
          focusables[0]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
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

      if (e.key === "Escape" || e.key === "BrowserBack") {
        if (activeCategory) {
          e.preventDefault();
          setActiveCategory(null);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, selected, activeCategory]);

  // Auto-focus the first item after load
  useEffect(() => {
    if (loading || videos.length === 0) return;
    setTimeout(() => {
      const first = document.querySelector<HTMLElement>("[data-tv-item]");
      first?.classList.add("is-focused");
    }, 500);
  }, [loading, videos.length, activeCategory]);

  const hero = videos.find((v) => v.featured) || videos[0];

  // Which rows to show
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
      return [{ title: activeCategory, items: videos.filter((v) => v.category === activeCategory) }];
    }
    return CATEGORIES.map((cat) => ({
      title: cat,
      items: videos.filter((v) => v.category === cat),
    })).filter((r) => r.items.length > 0);
  })();

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* TV Navigation CSS */}
      <style jsx global>{`
        [data-tv-item] {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        [data-tv-item].is-focused {
          transform: scale(1.06);
          box-shadow: 0 0 0 4px #dc2626, 0 0 30px rgba(220, 38, 38, 0.6);
          z-index: 40;
        }
        [data-tv-item].is-focused button,
        [data-tv-item].is-focused a {
          outline: none !important;
        }
        .tv-nav [data-tv-item].is-focused {
          transform: none !important;
          background: transparent !important;
          text-shadow: 0 0 12px rgba(255, 255, 255, 0.9) !important;
          color: #ffffff !important;
        }
        *:focus {
          outline: none !important;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Top Nav */}
      <nav className="sticky top-0 z-50 flex items-center gap-8 px-12 py-5 bg-gradient-to-b from-black via-black/95 to-transparent">
        <a href="/tv" className="text-3xl font-black tracking-tight">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </a>

        <div className="tv-nav flex gap-8 items-center">
          <button
            data-tv-item
            onClick={() => setActiveCategory(null)}
            className={`text-xl font-semibold whitespace-nowrap transition ${
              activeCategory === null ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Home
          </button>
          <button
            data-tv-item
            onClick={() => setActiveCategory("__MOVIES__")}
            className={`text-xl font-semibold whitespace-nowrap transition ${
              activeCategory === "__MOVIES__" ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Movies
          </button>
          <button
            data-tv-item
            onClick={() => setActiveCategory("__DOCS__")}
            className={`text-xl font-semibold whitespace-nowrap transition ${
              activeCategory === "__DOCS__" ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Documentaries
          </button>
          <button
            data-tv-item
            onClick={() => setActiveCategory("__PODCASTS__")}
            className={`text-xl font-semibold whitespace-nowrap transition ${
              activeCategory === "__PODCASTS__" ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Podcasts
          </button>
        </div>
      </nav>

      {/* Hero */}
      {!activeCategory && hero && (
        <section className="relative h-[65vh] w-full">
          <img
            src={hero.backdropUrl}
            alt={hero.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col justify-center h-full px-12 max-w-4xl pt-16">
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
            <p className="text-xl text-white/90 mb-8 max-w-2xl leading-relaxed line-clamp-3">
              {hero.description}
            </p>
            <div className="flex gap-4">
              <button
                data-tv-item
                onClick={() => setPlaying(hero)}
                className="flex items-center gap-3 bg-white text-black font-bold px-10 py-4 rounded text-xl"
              >
                <Play size={26} fill="black" /> Play
              </button>
              <button
                data-tv-item
                onClick={() => setSelected(hero)}
                className="flex items-center gap-3 bg-white/20 backdrop-blur text-white font-bold px-10 py-4 rounded text-xl"
              >
                <Info size={26} /> More Info
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Rows */}
      <div className="relative z-10 pt-8 pb-24 space-y-12">
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
          <div className="text-center py-20 text-white/50 text-xl">
            No videos yet
          </div>
        )}
        {loading && (
          <div className="text-center py-20 text-white/50 text-xl">
            Loading…
          </div>
        )}
      </div>

      {/* Detail overlay */}
      <AnimatePresence>
        {selected && (
          <DetailOverlay
            item={selected}
            onClose={() => setSelected(null)}
            onPlay={(v) => {
              setSelected(null);
              setPlaying(v);
            }}
          />
        )}
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
      </AnimatePresence>
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

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between px-12 mb-4">
        <h2 className="text-3xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
          >
            <ChevronRight size={24} className="rotate-180" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-12 pb-6"
      >
        {items.map((item) => (
          <TvCard
            key={item.id}
            item={item}
            onSelect={onSelect}
            onPlay={onPlay}
          />
        ))}
      </div>
    </div>
  );
}

function TvCard({
  item,
  onSelect,
  onPlay,
}: {
  item: Video;
  onSelect: (v: Video) => void;
  onPlay: (v: Video) => void;
}) {
  return (
    <div
      data-tv-item
      onClick={() => onSelect(item)}
      className="relative flex-shrink-0 w-[240px] aspect-[2/3] rounded-lg overflow-hidden cursor-pointer bg-[#141418]"
    >
      <img
        src={item.posterUrl}
        alt={item.title}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
        <p className="text-base font-bold leading-tight line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-white/70 mt-2">
          <span className="text-green-500 font-bold">{item.match}%</span>
          <span>{item.year}</span>
        </div>
      </div>
    </div>
  );
}

function DetailOverlay({
  item,
  onClose,
  onPlay,
}: {
  item: Video;
  onClose: () => void;
  onPlay: (v: Video) => void;
}) {
  // Handle back / escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "BrowserBack") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-6xl mx-auto my-8 bg-[#141418] rounded-xl overflow-hidden"
      >
        <div className="relative h-[60vh] w-full">
          <img
            src={item.backdropUrl}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-[#141418]/40 to-transparent" />
          <button
            data-tv-item
            onClick={onClose}
            className="absolute top-6 left-6 z-20 bg-black/70 hover:bg-black rounded-full p-3 transition"
          >
            <ArrowLeft size={28} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-12">
            <h2 className="text-4xl font-black mb-6">{item.title}</h2>
            <div className="flex gap-4">
              <button
                data-tv-item
                onClick={() => onPlay(item)}
                className="flex items-center gap-3 bg-white text-black font-bold px-10 py-4 rounded text-xl"
              >
                <Play size={26} fill="black" /> Play
              </button>
              <button
                data-tv-item
                onClick={onClose}
                className="flex items-center gap-3 bg-white/20 backdrop-blur text-white font-bold px-10 py-4 rounded text-xl"
              >
                <X size={26} /> Close
              </button>
            </div>
          </div>
        </div>
        <div className="p-12 grid grid-cols-3 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-4 text-lg mb-6">
              <span className="text-green-500 font-bold">{item.match}% Match</span>
              <span>{item.year}</span>
              <span className="border border-white/40 px-2 py-0.5 text-sm">{item.rating}</span>
            </div>
            <p className="text-xl text-white/90 leading-relaxed">{item.description}</p>
          </div>
          <div>
            <p className="text-white/50 mb-2 text-sm uppercase tracking-wide">Category</p>
            <p className="text-white/90 text-lg">{item.category}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
