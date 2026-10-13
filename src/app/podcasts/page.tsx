"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { useSearch } from "@/context/SearchContext";
import MobileBottomNav from "@/components/MobileBottomNav";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  description: string;
};

export default function PodcastsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const { search } = useSearch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json())
      .then((d) => {
        setCreators(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <TopBar />

      <div className="px-8 md:px-12 pt-28 pb-10">
        <h1 className="text-4xl md:text-5xl font-black mb-2">Podcasts</h1>
        <p className="text-white/50 mb-10">Browse shows by podcaster</p>

        {loading && <p className="text-white/40">Loading…</p>}
        {!loading && creators.length === 0 && (
          <p className="text-white/40">No podcasters yet.</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {creators
            .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
            .map((c) => (
            <Link
              key={c.id}
              href={`/podcaster/${c.slug}`}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-red-600 transition">
                {c.photoUrl ? (
                  <img
                    src={c.photoUrl}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-4xl font-black">
                    {c.name[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <p className="mt-4 font-bold text-lg group-hover:text-red-500 transition">
                {c.name}
              </p>
              {c.description && (
                <p className="text-sm text-white/50 mt-1 line-clamp-2">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
          <MobileBottomNav />
    </main>
  );
}
