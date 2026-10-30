"use client";

import { useState, useEffect } from "react";
import { Search, X, Play, CheckCircle2, User, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

const MAIN_CATEGORIES = [
  { name: "Documentaries", color: "bg-[#E13377]/60", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop" },
  { name: "Podcasts", color: "bg-[#1DB954]/60", image: "https://unsplash.com/photos/Qruwi3Ur3Ak/download?force=true&w=600" },
  { name: "Independent Films", color: "bg-[#2E77D0]/60", image: "https://unsplash.com/photos/mVv8igQaWoI/download?force=true&w=600" },
  { name: "Books", color: "bg-[#8400e7]/60", image: "https://unsplash.com/photos/_nm_mZ4Cs2I/download?force=true&w=600" },
  { name: "History", color: "bg-[#8b5cf6]/60", image: "https://unsplash.com/photos/JioCsloIYro/download?force=true&w=600" },
  { name: "Politics & Geopolitics", color: "bg-[#006450]/60", image: "https://unsplash.com/photos/2J5-T03yGQU/download?force=true&w=600" },
  { name: "War & Conflict", color: "bg-[#E53945]/60", image: "https://images.unsplash.com/photo-1579912205439-4cef16dc975e?q=80&w=600&auto=format&fit=crop" },
  { name: "True Crime", color: "bg-[#1e3264]/60", image: "https://unsplash.com/photos/yYpmCA32U_M/download?force=true&w=600" },
  { name: "Conspiracy & Mystery", color: "bg-[#7d4b96]/60", image: "https://unsplash.com/photos/BxELNNMN88Y/download?force=true&w=600" },
  { name: "Society & Culture", color: "bg-[#e86f2c]/60", image: "https://unsplash.com/photos/ehdsg7SHm6A/download?force=true&w=600" },
  { name: "Science & Health", color: "bg-[#0d73ec]/60", image: "https://unsplash.com/photos/gMpwyM4Lyuw/download?force=true&w=600" },
  { name: "Technology", color: "bg-[#00897b]/60", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop" },
  { name: "Religion & Belief", color: "bg-[#4527A0]/60", image: "https://unsplash.com/photos/UVssyWRCB24/download?force=true&w=600" },
  { name: "Ancient Civilisations", color: "bg-[#bf360c]/60", image: "https://unsplash.com/photos/4Wue5DQnxSw/download?force=true&w=600" },
  { name: "Comedy", color: "bg-[#ff9800]/60", image: "https://unsplash.com/photos/jvNoSUrQkgU/download?force=true&w=600" },
];

const TRENDING_TAGS = ["History", "Politics", "Ancient Civilisations", "Technology", "Science & Health"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      
      const videosPromise = fetch("/api/videos", { cache: "no-store" })
        .then(r => r.json())
        .catch(() => []);

      const profilesPromise = supabase
        .from("profiles")
        .select("user_id, creator_id, display_name, username, avatar_url, is_verified, tier")
        .then(res => res.data || []);

      const [videosData, profilesData] = await Promise.all([videosPromise, profilesPromise]);
      
      setAllVideos(Array.isArray(videosData) ? videosData : []);
      setAllProfiles(Array.isArray(profilesData) ? profilesData : []);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleCancel = () => {
    setQuery("");
    setIsSearching(false);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    setIsSearching(true);
  };

  // Filtering Logic
  const filteredProfiles = query.length > 0 ? allProfiles.filter(p => 
    p.display_name?.toLowerCase().includes(query.toLowerCase()) || 
    p.username?.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const filteredVideos = query.length > 0 ? allVideos.filter(v => 
    v.title?.toLowerCase().includes(query.toLowerCase()) || 
    v.description?.toLowerCase().includes(query.toLowerCase()) ||
    v.type?.toLowerCase().includes(query.toLowerCase()) ||
    v.category?.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const hasResults = filteredVideos.length > 0 || filteredProfiles.length > 0;

  // Discovery Data
  const trendingDocs = allVideos.filter(v => v.type === 'Documentary').slice(0, 6);
  const popularPodcasts = allVideos.filter(v => v.type === 'Podcast').slice(0, 5);
  const recentlyAdded = [...allVideos].sort((a, b) => b.id - a.id).slice(0, 6);
  const popularCreators = allProfiles.filter(p => p.tier === 'creator' || p.creator_id).slice(0, 8);

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24 font-sans relative">
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#1c1c1e]/50 to-transparent pointer-events-none z-0" />
      
      <div className="relative z-10">
        
        {/* ========================================= */}
        {/* MOBILE LAYOUT (Untouched) */}
        {/* ========================================= */}
        <div className="lg:hidden max-w-2xl mx-auto">
          <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl pt-4 pb-4 px-4 border-b border-white/5">
            {isSearching ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <input
                    type="text" autoFocus
                    className="w-full bg-white/10 backdrop-blur-xl text-white placeholder:text-white/50 rounded-full py-3 pl-11 pr-10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg text-[15px]"
                    placeholder="Search creators, users, videos..."
                    value={query} onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <div className="bg-white/30 rounded-full p-0.5"><X className="h-4 w-4 text-black" /></div>
                    </button>
                  )}
                </div>
                <button onClick={handleCancel} className="text-white font-medium text-base">Cancel</button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <input
                  type="text"
                  className="w-full bg-white/10 backdrop-blur-xl text-white font-medium text-[15px] placeholder:text-white/50 rounded-full py-3.5 pl-11 pr-6 border border-white/20 cursor-pointer shadow-lg"
                  placeholder="Search creators, users, videos..."
                  value={query} onClick={() => setIsSearching(true)} onChange={(e) => setQuery(e.target.value)} readOnly={!isSearching}
                />
              </div>
            )}
          </div>

          <div className="px-4 pt-4">
            {loading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>
            ) : isSearching || query.length > 0 ? (
              <div className="flex flex-col space-y-8 pb-10">
                {!hasResults && query.length > 0 && <div className="text-center py-10 text-white/50">No results found for "{query}".</div>}
                {filteredProfiles.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Creators & Users</h3>
                    <div className="flex flex-col space-y-3">
                      {filteredProfiles.map((profile) => (
                        <Link key={profile.user_id} href={`/profile/${profile.username}`} className="flex items-center gap-4 group hover:bg-white/5 p-2 -mx-2 rounded-xl transition">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1c1c1e] shrink-0 border border-white/10">
                            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-lg text-white/50">{profile.display_name?.[0] || <User size={18} />}</div>}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-bold text-base group-hover:text-[#E53945] transition-colors">{profile.display_name || "User"}</span>
                              {profile.is_verified && <CheckCircle2 size={14} className="text-[#1ed760]" fill="currentColor" />}
                            </div>
                            <span className="text-sm text-white/50">@{profile.username || "user"}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {filteredVideos.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Videos & Podcasts</h3>
                    <div className="flex flex-col space-y-3">
                      {filteredVideos.map((video) => (
                        <Link key={video.id} href={`/watch/${video.id}`} className="flex items-center gap-4 group hover:bg-white/5 p-2 -mx-2 rounded-xl transition">
                          <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-[#1c1c1e] shrink-0 border border-white/10">
                            <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-bold text-sm block truncate group-hover:text-[#E53945] transition-colors">{video.title}</span>
                            <span className="text-xs text-white/50">{video.type || "Video"} {video.category ? `• ${video.category}` : ''}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-10">
                {MAIN_CATEGORIES.map((cat) => (
                  <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className={`${cat.color} backdrop-blur-xl border border-white/20 rounded-xl p-4 h-24 relative overflow-hidden group shadow-lg block`}>
                    <h2 className="text-lg font-bold relative z-10 text-white drop-shadow-md leading-tight">{cat.name}</h2>
                    <img src={cat.image} alt={cat.name} className="absolute -right-2 -bottom-2 w-20 h-20 object-cover rotate-[25deg] shadow-2xl rounded-sm group-hover:scale-105 transition-transform duration-500 border border-white/10" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================= */}
        {/* DESKTOP LAYOUT (New Premium UI) */}
        {/* ========================================= */}
        <div className="hidden lg:block max-w-[1600px] mx-auto px-10 pt-24 pb-20">
          
          {/* 1. HERO SEARCH SECTION */}
          <div className="flex flex-col items-center justify-center text-center mb-16 pt-10">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
              DISCOVER <span className="text-[#E53945]">TROOFLIX</span>
            </h1>
            <p className="text-lg text-white/60 mb-10 max-w-2xl">
              Explore documentaries, independent films, podcasts and publications.
            </p>
            
            <div className="relative w-full max-w-4xl mx-auto mb-8">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-white/50" />
              </div>
              <input
                type="text"
                className="w-full bg-[#1c1c1e]/80 backdrop-blur-xl text-white font-medium text-lg placeholder:text-white/40 rounded-full py-5 pl-16 pr-8 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#E53945]/50 focus:border-[#E53945]/50 shadow-2xl transition-all"
                placeholder="Search everything on Trooflix..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute inset-y-0 right-0 pr-6 flex items-center">
                  <div className="bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition"><X className="h-5 w-5 text-white" /></div>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-white/50">
              <span className="flex items-center gap-1.5"><TrendingUp size={16} className="text-[#E53945]" /> Trending:</span>
              {TRENDING_TAGS.map((tag) => (
                <button key={tag} onClick={() => handleTagClick(tag)} className="hover:text-white transition">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-white/10 mb-12" />

          {/* 2. RESULTS VS DISCOVERY */}
          {query.length > 0 ? (
            <div className="w-full">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                Search Results for <span className="text-[#E53945]">"{query}"</span>
              </h2>
              {!hasResults ? (
                <div className="text-center py-20 bg-[#1c1c1e] rounded-3xl border border-white/5">
                  <p className="text-white/50 text-lg">No results found for "{query}".</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Desktop Profiles Results */}
                  {filteredProfiles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Creators & Users</h3>
                      <div className="grid grid-cols-4 gap-6">
                        {filteredProfiles.map((profile) => (
                          <Link key={profile.user_id} href={`/profile/${profile.username}`} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/5 hover:border-white/20 p-4 rounded-2xl transition group">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#09090B] shrink-0 border border-white/10">
                              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xl text-white/50">{profile.display_name?.[0] || <User size={24} />}</div>}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-bold text-lg truncate group-hover:text-[#E53945] transition-colors">{profile.display_name || "User"}</span>
                                {profile.is_verified && <CheckCircle2 size={16} className="text-[#1ed760]" fill="currentColor" />}
                              </div>
                              <span className="text-sm text-white/50">@{profile.username || "user"}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Desktop Videos Results */}
                  {filteredVideos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Videos, Podcasts & More</h3>
                      <div className="grid grid-cols-6 gap-4">
                        {filteredVideos.map((video) => (
                          <Link key={video.id} href={`/watch/${video.id}`} className="flex flex-col group">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-3 border border-white/5">
                              <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                            </div>
                            <span className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{video.title}</span>
                            <span className="text-xs text-white/50 mt-1">{video.type || "Video"} {video.category ? `• ${video.category}` : ''}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-16">
              
              {/* 3. CATEGORY GRID (3 Columns) */}
              <section>
                <h2 className="text-2xl font-bold mb-8">Browse Categories</h2>
                <div className="grid grid-cols-3 gap-6">
                  {MAIN_CATEGORIES.slice(0, 9).map((cat) => (
                    <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className={`group relative h-40 rounded-2xl overflow-hidden border border-white/10 block`}>
                      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className={`absolute inset-0 ${cat.color} mix-blend-multiply opacity-80 group-hover:opacity-60 transition-opacity`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-6 flex items-center justify-between w-full">
                        <h3 className="text-2xl font-black text-white drop-shadow-lg">{cat.name}</h3>
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                          <ChevronRight size={20} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <div className="w-full h-px bg-white/5" />

              {/* 4. TRENDING DOCUMENTARIES */}
              {trendingDocs.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Trending Documentaries</h2>
                    <button className="text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                  </div>
                  <div className="grid grid-cols-6 gap-6">
                    {trendingDocs.map((v) => (
                      <Link key={v.id} href={`/watch/${v.id}`} className="group flex flex-col">
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1c1c1e] mb-3 border border-white/5 shadow-lg">
                          <img src={v.posterUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
                        </div>
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{v.title}</h3>
                        <p className="text-xs text-white/50 mt-1">{v.year}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="w-full h-px bg-white/5" />

              {/* 5. POPULAR PODCASTS */}
              {popularPodcasts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Popular Podcasts</h2>
                    <button className="text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                  </div>
                  <div className="grid grid-cols-5 gap-6">
                    {popularPodcasts.map((v) => (
                      <Link key={v.id} href={`/watch/${v.id}`} className="group flex flex-col bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                        <div className="relative aspect-square overflow-hidden bg-[#09090B]">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        </div>
                        <div className="p-4">
                          <h3 className="text-base font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition-colors">{v.title}</h3>
                          <p className="text-xs text-white/50 mt-2">{v.type} • {v.category}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="w-full h-px bg-white/5" />

              {/* 6. POPULAR CREATORS */}
              {popularCreators.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Popular Creators</h2>
                    <button className="text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                  </div>
                  <div className="grid grid-cols-8 gap-4">
                    {popularCreators.map((c) => (
                      <Link key={c.user_id} href={`/profile/${c.username}`} className="flex flex-col items-center text-center group">
                        <div className="w-24 h-24 rounded-full p-[2px] bg-[#E53945] group-hover:scale-105 transition-transform mb-3">
                          <div className="w-full h-full rounded-full border-2 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                            {c.avatar_url ? <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">{c.display_name?.[0]?.toUpperCase() || "?"}</div>}
                          </div>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#E53945] transition-colors truncate w-full">{c.display_name || c.username}</h3>
                        <p className="text-xs text-white/50 mt-1">Creator</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="w-full h-px bg-white/5" />

              {/* 7. RECENTLY ADDED */}
              {recentlyAdded.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Recently Added</h2>
                    <button className="text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                  </div>
                  <div className="grid grid-cols-6 gap-6">
                    {recentlyAdded.map((v) => (
                      <Link key={v.id} href={`/watch/${v.id}`} className="group flex flex-col">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-3 border border-white/5 shadow-lg">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
                        </div>
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{v.title}</h3>
                        <p className="text-xs text-white/50 mt-1">{v.type || "Video"}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}

        </div>

        <MobileBottomNav />
      </div>
    </main>
  );
}
