"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Play, Info, X, ChevronLeft, ChevronRight } from "lucide-react";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  creatorId?: number | null;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  heroBackdropUrl?: string;
  description: string;
};

export default function PodcasterProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json())
      .then((all: Creator[]) => {
        const found = all.find((c) => c.slug === slug);
        if (!found) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCreator(found);
        return fetch("/api/videos")
          .then((r) => r.json())
          .then((allVideos: Video[]) => {
            setVideos(allVideos.filter((v) => v.creatorId === found.id));
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </main>
    );
  }

  if (notFound || !creator) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 mb-4">Podcaster not found.</p>
          <Link href="/podcasts" className="text-red-500 hover:underline">← All Podcasters</Link>
        </div>
      </main>
    );
  }

  const heroVideo = videos[0];

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <nav className="sticky top-0 z-50 flex items-center gap-6 px-8 py-4 bg-black/95 backdrop-blur border-b border-white/10">
        <Link href="/" className="text-2xl font-black tracking-tight">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>
        <div className="flex gap-6 ml-auto text-base">
          <Link href="/" className="text-white/70 hover:text-white">Home</Link>
          <Link href="/podcasts" className="text-white font-semibold">Podcasts</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-[60vh] w-full">
        {creator.heroBackdropUrl ? (
          <img
            src={creator.heroBackdropUrl}
            alt={creator.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : heroVideo?.backdropUrl ? (
          <img
            src={heroVideo.backdropUrl}
            alt={creator.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : creator.photoUrl ? (
          <img
            src={creator.photoUrl}
            alt={creator.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

        <div className="relative z-10 flex flex-col justify-end h-full px-8 md:px-12 pb-16 max-w-3xl">
          <div className="flex items-center gap-5 mb-5">
            {creator.photoUrl && (
              <img
                src={creator.photoUrl}
                alt={creator.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
              />
            )}
            <div>
              <p className="text-xs tracking-[0.3em] text-red-500 font-bold mb-1">
                PODCASTER
              </p>
              <h1 className="text-4xl md:text-6xl font-black leading-tight">
                {creator.name}
              </h1>
            </div>
          </div>
          {creator.description && (
            <p className="text-base md:text-lg text-white/85 max-w-2xl">
              {creator.description}
            </p>
          )}
        </div>
      </section>

      {/* Videos */}
      <div className="relative z-10 pt-10 pb-24 space-y-8">
        {videos.length === 0 && (
          <p className="px-12 text-white/40">No videos yet.</p>
        )}
        {videos.length > 0 && (
          <ProfileRow
            title="All Videos"
            items={videos}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-4xl mx-auto my-8 bg-[#141418] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[50vh] w-full">
              <img
                src={selected.backdropUrl || selected.posterUrl}
                alt={selected.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-[#141418]/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-10">
                <h2 className="text-4xl font-black mb-6">{selected.title}</h2>
                <div className="flex gap-4">
                  <a
                    href={selected.bitchuteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white text-black font-bold px-8 py-3 rounded text-lg"
                  >
                    <Play size={22} fill="black" /> Play
                  </a>
                  <button
                    onClick={() => setSelected(null)}
                    className="flex items-center gap-3 bg-white/20 backdrop-blur text-white font-bold px-8 py-3 rounded text-lg"
                  >
                    <X size={22} /> Close
                  </button>
                </div>
              </div>
            </div>
            <div className="p-10">
              {selected.description && (
                <p className="text-lg text-white/90 leading-relaxed">{selected.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileRow({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Video[];
  onSelect: (v: Video) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/row">
      <h2 className="text-xl font-bold px-8 md:px-12 mb-3">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"
        >
          <ChevronLeft size={28} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-8 md:px-12 pb-6"
        >
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="relative flex-shrink-0 w-[160px] md:w-[200px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer bg-[#141418] hover:scale-105 transition"
            >
              <img
                src={item.posterUrl}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2">
                <p className="text-xs font-bold leading-tight line-clamp-2">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
