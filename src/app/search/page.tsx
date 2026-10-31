"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, Play, CheckCircle2, User, TrendingUp, ChevronRight, Filter } from "lucide-react";
import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

const PRIMARY_CATEGORIES = [
  { name: "Documentaries", color: "bg-[#E13377]/60", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop" },
  { name: "Podcasts", color: "bg-[#1DB954]/60", image: "https://unsplash.com/photos/Qruwi3Ur3Ak/download?force=true&w=600" },
  { name: "Independent Films", color: "bg-[#2E77D0]/60", image: "https://unsplash.com/photos/mVv8igQaWoI/download?force=true&w=600" },
  { name: "Books", color: "bg-[#8400e7]/60", image: "https://unsplash.com/photos/_nm_mZ4Cs2I/download?force=true&w=600" },
];

const GENRE_CATEGORIES = [
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
  const [activeFilter, setActiveFilter] = useState<"all" | "videos" | "creators">("all");
  
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
        .select("user_id, creator_id, display_name, username, avatar_url, is_verified, tier, bio")
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
    setActiveFilter("all");
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    setIsSearching(true);
  };

  // ==========================================
  // ADVANCED SEARCH LOGIC
  // ==========================================
  const searchTerms = query.toLowerCase().split(" ").filter(Boolean);

  const filteredProfiles = useMemo(() => {
    if (query.length === 0) return [];
    return allProfiles.filter(p => {
      const text = `${p.display_name || ""} ${p.username || ""} ${p.bio || ""} ${p.tier || ""}`.toLowerCase();
      return searchTerms.every(term => text.includes(term));
    });
  }, [query, allProfiles, searchTerms]);

  const filteredVideos = useMemo(() => {
    if (query.length === 0) return [];
    
    const results = allVideos.map(v => {
      const creator = allProfiles.find(p => 
        String(p.creator_id) === String(v.creatorId) || 
        String(p.user_id) === String(v.uploaderUserId)
      );
      const creatorName = creator ? (creator.display_name || creator.username || "") : "";

      const searchableText = `
        ${v.title || ""} 
        ${v.description || ""} 
        ${v.category || ""} 
        ${v.type || ""} 
        ${creatorName}
        ${v.tags ? (Array.isArray(v.tags) ? v.tags.join(" ") : v.tags) : ""}
        ${v.keywords || ""}
        ${v.cast || ""}
        ${v.studio || ""}
      `.toLowerCase();

      const matches = searchTerms.every(term => searchableText.includes(term));
      
      let score = 0;
      if (matches) {
        score = 1;
        if (v.title.toLowerCase().includes(query.toLowerCase())) score += 10;
        if (v.title.toLowerCase().startsWith(query.toLowerCase())) score += 5;
        if (v.category?.toLowerCase().includes(query.toLowerCase())) score += 2;
      }

      return { ...v, searchScore: score };
    })
    .filter(v => v.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);

    return results;
  }, [query, allVideos, allProfiles, searchTerms]);

  const hasResults = filteredVideos.length > 0 || filteredProfiles.length > 0;
  const showVideos = activeFilter === "all" || activeFilter === "videos";
  const showCreators = activeFilter === "all" || activeFilter === "creators";

  // Discovery Data (When not searching)
  const trendingDocs = allVideos.filter(v => v.type === 'Documentary').slice(0, 6);
  const popularPodcasts = allVideos.filter(v => v.type === 'Podcast').slice(0, 5);
  const popularCreators = allProfiles.filter(p => p.tier === 'creator' || p.creator_id).slice(0, 8);

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24 font-sans relative">
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#1c1c1e]/50 to-transparent pointer-events-none z-0" />
      
      <div className="relative z-10">
        
        {/* FORCED DESKTOP LAYOUT ON ALL SCREENS (Spacing reduced for mobile) */}
        <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-10 pt-16 lg:pt-24 pb-20">
          
          {/* 1. HERO SEARCH SECTION */}
          <div className="flex flex-col items-center justify-center text-center mb-8 lg:mb-16 pt-0 lg:pt-10">
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-semibold mb-2 uppercase">
              The Home of Independent Voices
            </p>
            <h1 className="text-3xl md:text-6xl font-black tracking-tight mb-3 lg:mb-4 text-white">
              DISCOVER <span className="text-[#E53945]">TROOFLIX</span>
            </h1>
            <p className="text-sm md:text-lg text-white/60 mb-6 lg:mb-10 max-w-2xl">
              Explore documentaries, independent films, podcasts and publications.
            </p>
            
            <div className="relative w-full max-w-4xl mx-auto mb-4 lg:mb-8">
              <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 md:h-6 md:w-6 text-white/50" />
              </div>
              <input
                type="text"
                className="w-full bg-[#1c1c1e]/80 backdrop-blur-xl text-white font-medium text-base md:text-lg placeholder:text-white/40 rounded-full py-4 md:py-5 pl-12 md:pl-16 pr-8 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#E53945]/50 focus:border-[#E53945]/50 shadow-2xl transition-all"
                placeholder="Search titles, subjects, creators, keywords..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setIsSearching(true); }}
              />
              {query && (
                <button onClick={handleCancel} className="absolute inset-y-0 right-0 pr-4 md:pr-6 flex items-center">
                  <div className="bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition"><X className="h-5 w-5 text-white" /></div>
                </button>
              )}
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 text-xs md:text-sm text-white/50">
              <span className="flex items-center gap-1.5"><TrendingUp size={16} className="text-[#E53945]" /> Trending:</span>
              {TRENDING_TAGS.map((tag) => (
                <button key={tag} onClick={() => handleTagClick(tag)} className="hover:text-white transition">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-white/10 mb-6 lg:mb-12" />

          {/* 2. RESULTS VS DISCOVERY */}
          {query.length > 0 ? (
            <div className="w-full">
              
              {/* SEARCH FILTER TABS */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                  Search Results for <span className="text-[#E53945]">"{query}"</span>
                </h2>
                
                <div className="flex items-center gap-2 bg-[#1c1c1e] p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto">
                  <button onClick={() => setActiveFilter("all")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap ${activeFilter === "all" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>All ({filteredVideos.length + filteredProfiles.length})</button>
                  <button onClick={() => setActiveFilter("videos")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap ${activeFilter === "videos" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>Videos ({filteredVideos.length})</button>
                  <button onClick={() => setActiveFilter("creators")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap ${activeFilter === "creators" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>Creators ({filteredProfiles.length})</button>
                </div>
              </div>

              {!hasResults ? (
                <div className="text-center py-20 bg-[#1c1c1e] rounded-3xl border border-white/5 flex flex-col items-center justify-center">
                  <Filter size={48} className="text-white/10 mb-4" />
                  <p className="text-white/50 text-lg">No results found for "{query}".</p>
                  <p className="text-white/30 text-sm mt-2">Try searching for a different keyword or creator name.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Profiles Results */}
                  {showCreators && filteredProfiles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Creators & Users</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        {filteredProfiles.map((profile) => (
                          <Link key={profile.user_id} href={`/profile/${profile.username}`} className="flex items-center gap-3 md:gap-4 bg-[#1c1c1e] border border-white/5 hover:border-white/20 p-3 md:p-4 rounded-2xl transition group">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-[#09090B] shrink-0 border border-white/10">
                              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-lg md:text-xl text-white/50">{profile.display_name?.[0] || <User size={24} />}</div>}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-bold text-sm md:text-lg truncate group-hover:text-[#E53945] transition-colors">{profile.display_name || "User"}</span>
                                {profile.is_verified && <CheckCircle2 size={14} className="text-[#1ed760] hidden md:block" fill="currentColor" />}
                              </div>
                              <span className="text-xs md:text-sm text-white/50 truncate block">@{profile.username || "user"}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos Results */}
                  {showVideos && filteredVideos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Videos, Podcasts & More</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-6">
                        {filteredVideos.map((video) => (
                          <Link key={video.id} href={`/watch/${video.id}`} className="flex flex-col group">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-2 md:mb-3 border border-white/5 shadow-lg">
                              <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                            </div>
                            <span className="text-xs md:text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{video.title}</span>
                            <span className="text-[10px] md:text-xs text-white/50 mt-1">{video.type || "Video"} {video.category ? `• ${video.category}` : ''}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 lg:space-y-16">
              
              {/* 3. PRIMARY CATEGORIES (What would you like to watch?) */}
              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-8">What would you like to watch?</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  {PRIMARY_CATEGORIES.map((cat) => (
                    <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className={`group relative h-28 md:h-40 rounded-2xl overflow-hidden border border-white/10 block`}>
                      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className={`absolute inset-0 ${cat.color} mix-blend-multiply opacity-80 group-hover:opacity-60 transition-opacity`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-3 md:p-6 flex items-center justify-between w-full">
                        <h3 className="text-lg md:text-2xl font-black text-white drop-shadow-lg">{cat.name}</h3>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                          <ChevronRight size={16} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <div className="w-full h-px bg-white/5" />

              {/* 4. GENRE CATEGORIES (Browse by category) */}
              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-8">Browse by category</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                  {GENRE_CATEGORIES.map((cat) => (
                    <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className={`group relative h-28 md:h-40 rounded-2xl overflow-hidden border border-white/10 block`}>
                      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className={`absolute inset-0 ${cat.color} mix-blend-multiply opacity-80 group-hover:opacity-60 transition-opacity`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-3 md:p-6 flex items-center justify-between w-full">
                        <h3 className="text-lg md:text-2xl font-black text-white drop-shadow-lg">{cat.name}</h3>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                          <ChevronRight size={16} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <div className="w-full h-px bg-white/5" />

              {/* 5. TRENDING DOCUMENTARIES */}
              {trendingDocs.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold">Trending Documentaries</h2>
                    <button className="text-xs md:text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-6">
                    {trendingDocs.map((v) => (
                      <Link key={v.id} href={`/watch/${v.id}`} className="group flex flex-col">
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1c1c1e] mb-2 md:mb-3 border border-white/5 shadow-lg">
                          <img src={v.posterUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
                        </div>
                        <h3 className="text-xs md:text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{v.title}</h3>
                        <p className="text-[10px] md:text-xs text-white/50 mt-1">{v.year}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="w-full h-px bg-white/5" />

              {/* 6. POPULAR PODCASTS */}
              {popularPodcasts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold">Popular Podcasts</h2>
                    <button className="text-xs md:text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
                    {popularPodcasts.map((v) => (
                      <Link key={v.id} href={`/watch/${v.id}`} className="group flex flex-col bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                        <div className="relative aspect-square overflow-hidden bg-[#09090B]">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        </div>
                        <div className="p-3 md:p-4">
                          <h3 className="text-sm md:text-base font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition-colors">{v.title}</h3>
                          <p className="text-[10px] md:text-xs text-white/50 mt-1 md:mt-2">{v.type} • {v.category}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="w-full h-px bg-white/5" />

              {/* 7. POPULAR CREATORS */}
              {popularCreators.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold">Popular Creators</h2>
                    <button className="text-xs md:text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
                    {popularCreators.map((c) => (
                      <Link key={c.user_id} href={`/profile/${c.username}`} className="flex flex-col items-center text-center group">
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-full p-[2px] bg-[#E53945] group-hover:scale-105 transition-transform mb-2 md:mb-3">
                          <div className="w-full h-full rounded-full border-2 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                            {c.avatar_url ? <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg md:text-2xl font-bold text-white">{c.display_name?.[0]?.toUpperCase() || "?"}</div>}
                          </div>
                        </div>
                        <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-[#E53945] transition-colors truncate w-full">{c.display_name || c.username}</h3>
                        <p className="text-[10px] md:text-xs text-white/50 mt-0.5 md:mt-1">Creator</p>
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
