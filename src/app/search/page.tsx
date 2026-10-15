"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, X, Play } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";

type Video = {
  id: number;
  title: string;
  description?: string;
  category?: string;
  type?: string;
  posterUrl?: string;
  backdropUrl?: string;
  creatorId?: number | null;
};

type Podcaster = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  description?: string;
  isVerified?: boolean;
};

type User = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [podcasters, setPodcasters] = useState<Podcaster[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setVideos([]);
      setPodcasters([]);
      setUsers([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          setVideos(d.videos || []);
          setPodcasters(d.podcasters || []);
          setUsers(d.users || []);
          setSearched(true);
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const total = videos.length + podcasters.length + users.length;

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
        {/* Search bar */}
        <div className="sticky top-16 md:top-20 z-30 bg-black pb-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 focus-within:border-white/30 transition">
            <SearchIcon size={18} className="text-white/50 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos, podcasters, users…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
              style={{ fontSize: "16px" }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-white/50 hover:text-white flex-shrink-0"
                aria-label="Clear"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!query && (
          <p className="text-white/40 text-center py-16 text-sm">
            Start typing to search.
          </p>
        )}

        {query && query.trim().length < 2 && (
          <p className="text-white/40 text-center py-16 text-sm">
            Keep typing…
          </p>
        )}

        {loading && (
          <p className="text-white/40 text-center py-12">Searching…</p>
        )}

        {!loading && searched && total === 0 && (
          <p className="text-white/40 text-center py-12">
            No results for “{query}”
          </p>
        )}

        {/* Results */}
        {!loading && total > 0 && (
          <div className="space-y-8">
            {/* Videos */}
            {videos.length > 0 && (
              <section>
                <h2 className="text-xs font-bold tracking-widest text-white/40 mb-3">
                  VIDEOS
                </h2>
                <div className="divide-y divide-white/5">
                  {videos.map((v) => (
                    <Link
                      key={v.id}
                      href={
                        v.creatorId
                          ? `/podcaster/${(v as any).creatorSlug || ""}/${v.id}`
                          : `/feed`
                      }
                      className="flex gap-3 py-3 hover:bg-white/[0.03] -mx-4 px-4 transition"
                    >
                      <div className="w-24 h-14 md:w-28 md:h-16 rounded-md overflow-hidden bg-[#141418] flex-shrink-0 relative">
                        {v.posterUrl || v.backdropUrl ? (
                          <img
                            src={v.posterUrl || v.backdropUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play size={18} fill="white" className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <p className="font-semibold text-sm leading-snug line-clamp-2">
                          {v.title}
                        </p>
                        {v.category && (
                          <p className="text-xs text-white/50 mt-1">{v.category}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Podcasters */}
            {podcasters.length > 0 && (
              <section>
                <h2 className="text-xs font-bold tracking-widest text-white/40 mb-3">
                  PODCASTERS
                </h2>
                <div className="divide-y divide-white/5">
                  {podcasters.map((p) => (
                    <Link
                      key={p.id}
                      href={`/podcaster/${p.slug}`}
                      className="flex items-center gap-3 py-3 hover:bg-white/[0.03] -mx-4 px-4 transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold">
                            {(p.name[0] || "?").toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold inline-flex items-center gap-1.5 max-w-full">
                          <span className="truncate">{p.name}</span>
                          {p.isVerified && <VerifiedBadge size={14} />}
                        </p>
                        {p.description && (
                          <p className="text-xs text-white/50 truncate">{p.description}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Users */}
            {users.length > 0 && (
              <section>
                <h2 className="text-xs font-bold tracking-widest text-white/40 mb-3">
                  USERS
                </h2>
                <div className="divide-y divide-white/5">
                  {users.map((u) => {
                    const name = u.display_name || `@${u.username}`;
                    return (
                      <Link
                        key={u.user_id}
                        href={`/u/${u.username || u.user_id}`}
                        className="flex items-center gap-3 py-3 hover:bg-white/[0.03] -mx-4 px-4 transition"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold">
                              {(name[0] || "?").toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{name}</p>
                          {u.username && (
                            <p className="text-xs text-white/50 truncate">@{u.username}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
