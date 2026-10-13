"use client";

import Link from "next/link";
import { Play } from "lucide-react";

type Video = {
  id: number;
  title: string;
  posterUrl: string;
  backdropUrl?: string;
  year?: number;
  rating?: string;
  type?: string;
  [key: string]: any;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  description?: string;
  [key: string]: any;
};

export default function SearchResults({
  search,
  videos,
  creators,
  onVideoClick,
}: {
  search: string;
  videos: any[];
  creators: any[];
  onVideoClick: (v: any) => void;
}) {
  const matchingVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  const matchingCreators = creators.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasResults = matchingVideos.length > 0 || matchingCreators.length > 0;

  return (
    <div className="px-4 md:px-12 py-8 space-y-10">
      <div>
        <p className="text-xs tracking-[0.3em] text-white/50 font-semibold mb-1">
          SEARCH RESULTS FOR
        </p>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">
          "{search}"
        </h1>
      </div>

      {!hasResults && (
        <div className="text-center py-16">
          <p className="text-white/70 text-lg mb-2">No results found</p>
          <p className="text-white/40 text-sm">
            Try a different keyword, or check the spelling.
          </p>
        </div>
      )}

      {matchingVideos.length > 0 && (
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            Videos <span className="text-white/40 text-base font-normal">({matchingVideos.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {matchingVideos.map((v) => (
              <div
                key={v.id}
                onClick={() => onVideoClick(v)}
                className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer bg-[#141418] hover:scale-105 transition group"
              >
                <img
                  src={v.posterUrl}
                  alt={v.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2">
                  <p className="text-[10px] md:text-xs font-bold leading-tight line-clamp-2">
                    {v.title}
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="bg-white/20 backdrop-blur rounded-full p-3">
                    <Play size={22} fill="white" className="text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {matchingCreators.length > 0 && (
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            Podcasters <span className="text-white/40 text-base font-normal">({matchingCreators.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {matchingCreators.map((c) => (
              <Link
                key={c.id}
                href={`/podcaster/${c.slug}`}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-red-600 transition">
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-3xl font-black">
                      {c.name[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <p className="mt-3 font-bold group-hover:text-red-500 transition">
                  {c.name}
                </p>
                {c.description && (
                  <p className="text-xs text-white/50 mt-1 line-clamp-2">{c.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
