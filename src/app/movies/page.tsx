"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Info, ChevronLeft, ChevronRight, Plus, ThumbsUp, X } from "lucide-react";
import TopBar from "@/components/TopBar";
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
  creatorId?: number | null;
};

export default function MoviesPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((data) => {
        const movies = Array.isArray(data)
          ? data.filter((v: any) => v.type === "Movie" && !v.creatorId)
          : [];
        setVideos(movies);
        setLoaded(true);
      });
  }, []);

  const hero = videos.find((v) => v.featured) || videos[0];
  const newReleases = [...videos].sort((a, b) => b.id - a.id).slice(0, 20);
  const byCategory = Array.from(new Set(videos.map((v) => v.category))).map((cat) => ({
    title: cat,
    items: videos.filter((v) => v.category === cat),
  }));

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <TopBar />

      {hero && <Hero video={hero} onPlay={() => setPlaying(hero)} onMore={() => setSelected(hero)} />}

      <div className="relative z-10 -mt-24 md:-mt-32 pb-24 space-y-8 md:space-y-12">
        {loaded && videos.length === 0 && (
          <div className="text-center py-20 text-white/50">
            <p className="text-xl mb-2">No movies yet</p>
          </div>
        )}
        {newReleases.length > 0 && (
          <Row title="New Movies" items={newReleases} onSelect={setSelected} onPlay={setPlaying} />
        )}
        {byCategory.map((row) => (
          <Row key={row.title} title={row.title} items={row.items} onSelect={setSelected} onPlay={setPlaying} />
        ))}
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onPlay={(v) => { setSelected(null); setPlaying(v); }} />}
      {playing && playing.bitchuteUrl.includes("bitchute.com") && (
        <BitChutePlayer src={playing.bitchuteUrl} title={playing.title} onClose={() => setPlaying(null)} />
      )}
      {playing && !playing.bitchuteUrl.includes("bitchute.com") && (
        <VideoPlayer src={playing.bitchuteUrl} title={playing.title} videoId={playing.id} onClose={() => setPlaying(null)} />
      )}
    </main>
  );
}

function Hero({ video, onPlay, onMore }: { video: Video; onPlay: () => void; onMore: () => void }) {
  return (
    <section className="relative h-[70vh] md:h-[85vh] w-full">
      <img src={video.backdropUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 max-w-2xl pt-24 md:pt-20 pb-12 md:pb-0">
        <p className="text-xs md:text-sm tracking-[0.3em] text-red-500 font-bold mb-3">
          TROOFLIX MOVIE
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-4 tracking-tight">
          {video.title}
        </h1>
        <div className="flex items-center gap-3 text-sm mb-4 flex-wrap">
          <span className="text-green-500 font-bold">{video.match}% Match</span>
          <span className="text-white/70">{video.year}</span>
          <span className="border border-white/40 px-1.5 py-0.5 text-xs">{video.rating}</span>
          <span className="text-white/70">{video.type}</span>
        </div>
        <p className="text-sm md:text-base text-white/85 mb-6 line-clamp-3 max-w-xl">
          {video.description}
        </p>
        <div className="flex gap-3">
          <button onClick={onPlay} className="flex items-center gap-2 bg-white text-black font-bold px-6 md:px-8 py-2.5 md:py-3 rounded hover:bg-white/80 transition">
            <Play size={20} fill="black" /> Play
          </button>
          <button onClick={onMore} className="flex items-center gap-2 bg-white/20 backdrop-blur text-white font-semibold px-5 md:px-7 py-2.5 md:py-3 rounded hover:bg-white/30 transition">
            <Info size={20} /> More Info
          </button>
        </div>
      </div>
    </section>
  );
}

function Row({ title, items, onSelect, onPlay }: { title: string; items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };
  return (
    <div className="relative group/row">
      <h2 className="text-xl font-bold px-8 md:px-12 mb-3">{title}</h2>
      <div className="relative">
        <button onClick={() => scroll("left")} className="hidden md:flex absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center">
          <ChevronLeft size={28} />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide px-8 md:px-12 pb-4">
          {items.map((item) => (
            <div key={item.id} onClick={() => onSelect(item)} className="relative flex-shrink-0 w-[140px] md:w-[180px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer bg-[#141418] hover:scale-105 transition">
              <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2">
                <p className="text-[10px] md:text-xs font-bold leading-tight line-clamp-2">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => scroll("right")} className="hidden md:flex absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center">
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}

function DetailModal({ item, onClose, onPlay }: { item: Video; onClose: () => void; onPlay: (v: Video) => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 overflow-y-auto" onClick={onClose}>
      <div className="relative max-w-4xl mx-auto my-12 bg-[#141418] rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-[400px] w-full">
          <img src={item.backdropUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-[#141418]/40 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 rounded-full p-2"><X size={20} /></button>
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h2 className="text-4xl md:text-5xl font-black mb-6">{item.title}</h2>
            <div className="flex gap-3">
              <button onClick={() => onPlay(item)} className="flex items-center gap-2 bg-white text-black font-semibold px-8 py-3 rounded hover:bg-white/80 transition">
                <Play size={20} fill="black" /> Play
              </button>
              <button className="border-2 border-white/60 rounded-full p-3 hover:border-white transition"><Plus size={20} /></button>
              <button className="border-2 border-white/60 rounded-full p-3 hover:border-white transition"><ThumbsUp size={20} /></button>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-center gap-3 text-sm text-white/80 mb-4 flex-wrap">
            <span className="text-green-400 font-bold">{item.match}% Match</span>
            <span>{item.year}</span>
            <span className="border border-white/40 px-2 py-0.5">{item.rating}</span>
          </div>
          <p className="text-white/90 leading-relaxed">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
