"use client";

import { useState, useEffect } from "react";
import { Search, X, Play, CheckCircle2, User } from "lucide-react";
import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

const MAIN_CATEGORIES = [
  { name: "Documentaries", color: "bg-[#E13377]/60", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=300&auto=format&fit=crop" },
  { name: "Podcasts", color: "bg-[#1DB954]/60", image: "https://unsplash.com/photos/Qruwi3Ur3Ak/download?force=true&w=300" },
  { name: "Independent Films", color: "bg-[#2E77D0]/60", image: "https://unsplash.com/photos/mVv8igQaWoI/download?force=true&w=300" },
  { name: "Books", color: "bg-[#8400e7]/60", image: "https://unsplash.com/photos/_nm_mZ4Cs2I/download?force=true&w=300" },
];

const BROWSE_ALL = [
  { name: "History", color: "bg-[#8b5cf6]/60", image: "https://unsplash.com/photos/JioCsloIYro/download?force=true&w=300" },
  { name: "Politics & Geopolitics", color: "bg-[#006450]/60", image: "https://unsplash.com/photos/2J5-T03yGQU/download?force=true&w=300" },
  { name: "War & Conflict", color: "bg-[#E53945]/60", image: "https://images.unsplash.com/photo-1579912205439-4cef16dc975e?q=80&w=300&auto=format&fit=crop" },
  { name: "True Crime & Justice", color: "bg-[#1e3264]/60", image: "https://unsplash.com/photos/yYpmCA32U_M/download?force=true&w=300" },
  { name: "Conspiracy & Mystery", color: "bg-[#7d4b96]/60", image: "https://unsplash.com/photos/BxELNNMN88Y/download?force=true&w=300" },
  { name: "Society & Culture", color: "bg-[#e86f2c]/60", image: "https://unsplash.com/photos/ehdsg7SHm6A/download?force=true&w=300" },
  { name: "Business & Finance", color: "bg-[#b28b00]/60", image: "https://unsplash.com/photos/8lnbXtxFGZw/download?force=true&w=300" },
  { name: "Science & Technology", color: "bg-[#0d73ec]/60", image: "https://unsplash.com/photos/gMpwyM4Lyuw/download?force=true&w=300" },
  { name: "Environment & Nature", color: "bg-[#00897b]/60", image: "https://unsplash.com/photos/1Z2niiBPg5A/download?force=true&w=300" },
  { name: "Religion & Spirituality", color: "bg-[#4527A0]/60", image: "https://unsplash.com/photos/UVssyWRCB24/download?force=true&w=300" },
  { name: "Ancient Civilisation", color: "bg-[#bf360c]/60", image: "https://unsplash.com/photos/4Wue5DQnxSw/download?force=true&w=300" },
  { name: "Comedy", color: "bg-[#ff9800]/60", image: "https://unsplash.com/photos/jvNoSUrQkgU/download?force=true&w=300" },
  { name: "News", color: "bg-[#c62828]/60", image: "https://unsplash.com/photos/hWJsOnaWTqs/download?force=true&w=300" },
  { name: "Gaming", color: "bg-[#673ab7]/60", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop" },
];

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

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans relative">
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-0" />
      
      <div className="relative z-10">
        <div className="max-w-2xl mx-auto">
          
          <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl pt-4 pb-4 px-4 border-b border-white/5">
            {isSearching ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    className="w-full bg-white/10 backdrop-blur-xl text-white placeholder:text-white/50 rounded-full py-3 pl-11 pr-10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg text-[15px]"
                    placeholder="Search creators, users, videos, podcasts..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button 
                      onClick={() => setQuery("")}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <div className="bg-white/30 rounded-full p-0.5">
                        <X className="h-4 w-4 text-black" />
                      </div>
                    </button>
                  )}
                </div>
                <button onClick={handleCancel} className="text-white font-medium text-base hover:text-gray-300">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <input
                  type="text"
                  className="w-full bg-white/10 backdrop-blur-xl text-white font-medium text-[15px] placeholder:text-white/50 rounded-full py-3.5 pl-11 pr-6 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all"
                  placeholder="Search creators, users, videos, podcasts..."
                  value={query}
                  onClick={() => setIsSearching(true)}
                  onChange={(e) => setQuery(e.target.value)}
                  readOnly={!isSearching}
                />
              </div>
            )}
          </div>

          <div className="px-4 pt-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
              </div>
            ) : isSearching || query.length > 0 ? (
              
              <div className="flex flex-col space-y-8 pb-10">
                {!hasResults && query.length > 0 && (
                  <div className="text-center py-10 text-white/50">
                    No results found for "{query}".
                  </div>
                )}

                {filteredProfiles.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Creators & Users</h3>
                    <div className="flex flex-col space-y-3">
                      {filteredProfiles.map((profile) => {
                        // FIXED: Always go to the public profile page
                        const profileLink = `/profile/${profile.username}`;

                        return (
                          <Link key={profile.user_id} href={profileLink} className="flex items-center gap-4 group hover:bg-white/5 p-2 -mx-2 rounded-xl transition">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1c1c1e] shrink-0 border border-white/10">
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-lg text-white/50">
                                  {profile.display_name?.[0] || <User size={18} />}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-bold text-base group-hover:text-[#E53945] transition-colors">{profile.display_name || "User"}</span>
                                {profile.is_verified && <CheckCircle2 size={14} className="text-[#1ed760]" fill="currentColor" />}
                                {profile.tier === 'creator' && (
                                  <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Creator</span>
                                )}
                              </div>
                              <span className="text-sm text-white/50">@{profile.username || "user"}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredVideos.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Videos, Podcasts & More</h3>
                    <div className="flex flex-col space-y-3">
                      {filteredVideos.map((video) => (
                        <Link key={video.id} href={`/watch/${video.id}`} className="flex items-center gap-4 group hover:bg-white/5 p-2 -mx-2 rounded-xl transition">
                          <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-[#1c1c1e] shrink-0 border border-white/10">
                            <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play size={16} fill="white" />
                            </div>
                            {video.duration && (
                              <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-bold">
                                {video.duration}
                              </div>
                            )}
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
              
              <>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {MAIN_CATEGORIES.map((cat) => (
                    <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className={`${cat.color} backdrop-blur-xl border border-white/20 rounded-xl p-4 h-24 relative overflow-hidden cursor-pointer group shadow-lg hover:bg-white/10 transition-colors block`}>
                      <h2 className="text-xl font-bold relative z-10 text-white drop-shadow-md">{cat.name}</h2>
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="absolute -right-2 -bottom-2 w-20 h-20 object-cover rotate-[25deg] shadow-2xl rounded-sm group-hover:scale-105 transition-transform duration-500 border border-white/10" 
                      />
                    </Link>
                  ))}
                </div>

                <div className="mb-4 mt-2">
                  <p className="text-[10px] md:text-xs tracking-[0.4em] text-white/50 font-semibold mb-1">
                    EXPLORE OUR COLLECTIONS
                  </p>
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                    Discover Something <span className="text-red-600">Real</span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-10">
                  {BROWSE_ALL.map((cat) => (
                    <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className={`${cat.color} backdrop-blur-xl border border-white/20 rounded-xl p-4 h-24 relative overflow-hidden cursor-pointer group shadow-lg hover:bg-white/10 transition-colors block`}>
                      <h2 className="text-lg font-bold relative z-10 text-white drop-shadow-md leading-tight">{cat.name}</h2>
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="absolute -right-2 -bottom-2 w-16 h-16 md:w-20 md:h-20 object-cover rotate-[25deg] shadow-2xl rounded-sm group-hover:scale-105 transition-transform duration-500 border border-white/10" 
                      />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        <MobileBottomNav />
      </div>
    </main>
  );
}
