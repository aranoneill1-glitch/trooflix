"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Play, User, TrendingUp, ChevronRight, Filter, Clock, Radio, Film, Mic, Clapperboard, Sparkles } from "lucide-react";
import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";
import TopBar from "@/components/TopBar";
import { createClient } from "@/utils/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";

const PRIMARY_CATEGORIES = [
  { name: "Documentaries", color: "bg-[#E13377]/60", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop" },
  { name: "Podcasts", color: "bg-[#1DB954]/60", image: "https://unsplash.com/photos/Qruwi3Ur3Ak/download?force=true&w=600" },
  { name: "Independent Films", color: "bg-[#2E77D0]/60", image: "https://unsplash.com/photos/mVv8igQaWoI/download?force=true&w=600" },
  { name: "Books", color: "bg-[#8400e7]/60", image: "https://unsplash.com/photos/_nm_mZ4Cs2I/download?force=true&w=600" },
];

const GENRE_CATEGORIES = [
  { name: "History", color: "bg-[#8b5cf6]/60", image: "https://unsplash.com/photos/JioCsloIYro/download?force=true&w=600" },
  { name: "Politics & Geopolitics", color: "bg-[#006450]/60", image: "https://unsplash.com/photos/2J5-T03yGQU/download?force=true&w=600" },
  { name: "War & Conflict", color: "bg-[#E53945]/60", image: "https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?q=80&w=600&auto=format&fit=crop" },
  { name: "True Crime & Justice", color: "bg-[#1e3264]/60", image: "https://unsplash.com/photos/yYpmCA32U_M/download?force=true&w=600" },
  { name: "Conspiracy & Mystery", color: "bg-[#7d4b96]/60", image: "https://unsplash.com/photos/BxELNNMN88Y/download?force=true&w=600" },
  { name: "Society & Culture", color: "bg-[#e86f2c]/60", image: "https://unsplash.com/photos/ehdsg7SHm6A/download?force=true&w=600" },
  { name: "Science & Technology", color: "bg-[#0d73ec]/60", image: "https://unsplash.com/photos/gMpwyM4Lyuw/download?force=true&w=600" },
  { name: "Business & Finance", color: "bg-[#8b5cf6]/60", image: "https://unsplash.com/photos/8lnbXtxFGZw/download?force=true&w=600" },
  { name: "Environment & Nature", color: "bg-[#1DB954]/60", image: "https://unsplash.com/photos/1Z2niiBPg5A/download?force=true&w=600" },
  { name: "Religion & Spirituality", color: "bg-[#E53945]/60", image: "https://unsplash.com/photos/UVssyWRCB24/download?force=true&w=600" },
  { name: "Ancient Civilisation", color: "bg-[#8400e7]/60", image: "https://unsplash.com/photos/4Wue5DQnxSw/download?force=true&w=600" },
  { name: "Comedy", color: "bg-[#E13377]/60", image: "https://unsplash.com/photos/jvNoSUrQkgU/download?force=true&w=600" },
  { name: "News", color: "bg-[#2E77D0]/60", image: "https://unsplash.com/photos/hWJsOnaWTqs/download?force=true&w=600" },
  { name: "Gaming", color: "bg-[#006450]/60", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop" },
  { name: "Medicine", color: "bg-[#1DB954]/60", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=600&auto=format&fit=crop" }
];

const TRENDING_TAGS = ["History", "Politics", "Ancient Civilisations", "Technology", "Science & Health"];
const RECENT_SEARCHES_KEY = "trooflix_recent_searches_v1";

type FilterType = "all" | "creators" | "live" | "shorts" | "videos" | "podcasts";

function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}

function isLiveVideo(v: any) {
  const t = normalize(v.type);
  return Boolean(v.is_live || v.isLive || v.live || t === "live" || t === "livestream" || t === "live-stream");
}

function isShortVideo(v: any) {
  const t = normalize(v.type);
  return t === "short" || t === "reel" || t === "shorts" || t === "reels";
}

function isPodcastVideo(v: any) {
  const t = normalize(v.type);
  return t === "podcast" || t === "podcasts";
}

function isLongVideo(v: any) {
  if (isLiveVideo(v) || isShortVideo(v)) return false;
  const t = normalize(v.type);
  if (t === "tweet") return false;
  if (isPodcastVideo(v)) return true;
  // treat documentaries/films/series/long-video/movie as videos bucket
  return Boolean(v.videoUrl || v.bitchuteUrl || v.id);
}

function scoreMatch(text: string, query: string, terms: string[]) {
  const t = normalize(text);
  const q = normalize(query);
  if (!q || !t) return 0;

  let score = 0;
  if (t === q) score += 100;
  if (t.startsWith(q)) score += 40;
  if (t.includes(q)) score += 25;

  let allTerms = true;
  let anyTerm = false;
  for (const term of terms) {
    if (!term) continue;
    if (t.includes(term)) {
      anyTerm = true;
      score += 8;
      if (t.startsWith(term)) score += 4;
      // partial/typo-friendly: prefix match on words
      const words = t.split(/[^a-z0-9]+/).filter(Boolean);
      for (const w of words) {
        if (w.startsWith(term)) score += 3;
        else if (term.length >= 4 && w.startsWith(term.slice(0, Math.max(3, term.length - 1)))) score += 1.5;
      }
    } else {
      allTerms = false;
      // typo tolerance light: allow near-prefix for longer terms
      if (term.length >= 5) {
        const prefix = term.slice(0, term.length - 1);
        if (t.includes(prefix)) { anyTerm = true; score += 2; }
      }
    }
  }
  if (terms.length > 1 && allTerms) score += 12;
  if (!anyTerm && !t.includes(q)) return 0;
  return score;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const videosPromise = fetch("/api/videos", { cache: "no-store" })
        .then(r => r.json())
        .catch(() => []);
      const profilesPromise = supabase
        .from("profiles")
        .select("user_id, creator_id, display_name, username, avatar_url, is_verified, verification_tick, tier, bio")
        .then(res => res.data || []);
      const [videosData, profilesData] = await Promise.all([videosPromise, profilesPromise]);
      setAllVideos(Array.isArray(videosData) ? videosData : []);
      setAllProfiles(Array.isArray(profilesData) ? profilesData : []);
      setLoading(false);
    }
    loadData();
  }, []);

  const saveRecentSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches(prev => {
      const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch {}
  };

  const applySearch = (term: string) => {
    const t = term.trim();
    setQuery(t);
    if (t) {
      saveRecentSearch(t);
      router.replace(`/search?q=${encodeURIComponent(t)}`);
    } else {
      router.replace("/search");
    }
    setIsFocused(false);
  };

  const searchTerms = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);

  const scoredProfiles = useMemo(() => {
    if (searchTerms.length === 0) return [];
    return allProfiles
      .map(p => {
        const text = `${p.display_name || ""} ${p.username || ""} ${p.bio || ""} ${p.tier || ""}`;
        const score = scoreMatch(text, query, searchTerms) + (normalize(p.display_name || "").startsWith(normalize(query)) ? 10 : 0);
        return { ...p, _score: score };
      })
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score);
  }, [query, allProfiles, searchTerms]);

  const scoredVideos = useMemo(() => {
    if (searchTerms.length === 0) return [];
    return allVideos
      .filter(v => normalize(v.type) !== "tweet")
      .map(v => {
        const creator = allProfiles.find(p =>
          String(p.creator_id) === String(v.creatorId) ||
          String(p.user_id) === String(v.uploaderUserId)
        );
        const creatorName = creator ? (creator.display_name || creator.username || "") : "";
        const searchableText = [
          v.title, v.description, v.category, v.type, creatorName,
          Array.isArray(v.tags) ? v.tags.join(" ") : v.tags, v.keywords, v.cast, v.studio
        ].filter(Boolean).join(" ");
        let score = scoreMatch(searchableText, query, searchTerms);
        if (score > 0) {
          if (normalize(v.title || "").includes(normalize(query))) score += 12;
          if (normalize(v.title || "").startsWith(normalize(query))) score += 8;
          if (normalize(v.category || "").includes(normalize(query))) score += 3;
        }
        return { ...v, _score: score };
      })
      .filter(v => v._score > 0)
      .sort((a, b) => b._score - a._score);
  }, [query, allVideos, allProfiles, searchTerms]);

  const liveResults = useMemo(() => scoredVideos.filter(isLiveVideo), [scoredVideos]);
  const shortsResults = useMemo(() => scoredVideos.filter(isShortVideo), [scoredVideos]);
  const podcastsResults = useMemo(() => scoredVideos.filter(isPodcastVideo), [scoredVideos]);
  const videosResults = useMemo(() => scoredVideos.filter(v => !isLiveVideo(v) && !isShortVideo(v)), [scoredVideos]);

  const filteredProfiles = scoredProfiles;
  const filteredVideos = useMemo(() => {
    if (activeFilter === "all") return scoredVideos;
    if (activeFilter === "live") return liveResults;
    if (activeFilter === "shorts") return shortsResults;
    if (activeFilter === "podcasts") return podcastsResults;
    if (activeFilter === "videos") return videosResults;
    return [];
  }, [activeFilter, scoredVideos, liveResults, shortsResults, podcastsResults, videosResults]);

  const showCreators = activeFilter === "all" || activeFilter === "creators";
  const showVideos = activeFilter !== "creators";

  const hasResults = (showCreators && filteredProfiles.length > 0) || (showVideos && filteredVideos.length > 0);

  const suggestions = useMemo(() => {
    if (searchTerms.length === 0) return [];
    const out: { type: "creator" | "video"; label: string; sub?: string; href?: string; video?: any }[] = [];
    for (const p of scoredProfiles.slice(0, 4)) {
      out.push({ type: "creator", label: p.display_name || p.username || "Creator", sub: p.username ? `@${p.username}` : "Creator", href: `/profile/${p.username}` });
    }
    for (const v of scoredVideos.slice(0, 5)) {
      const sub = isLiveVideo(v) ? "Live" : isShortVideo(v) ? "Short" : isPodcastVideo(v) ? "Podcast" : (v.type || "Video");
      out.push({ type: "video", label: v.title || "Untitled", sub, video: v });
    }
    return out.slice(0, 8);
  }, [scoredProfiles, scoredVideos, searchTerms.length]);

  const trendingDocs = allVideos.filter(v => normalize(v.type) === "documentary").slice(0, 6);
  const popularPodcasts = allVideos.filter(v => isPodcastVideo(v)).slice(0, 5);
  const popularCreators = allProfiles.filter(p => p.tier === "creator" || p.creator_id).slice(0, 8);

  const filterTabs: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All", count: scoredVideos.length + scoredProfiles.length },
    { key: "creators", label: "Creators", count: scoredProfiles.length },
    { key: "live", label: "Live", count: liveResults.length },
    { key: "shorts", label: "Shorts", count: shortsResults.length },
    { key: "videos", label: "Videos", count: videosResults.length },
    { key: "podcasts", label: "Podcasts", count: podcastsResults.length },
  ];

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24 font-sans relative">
      <TopBar />

      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#1c1c1e]/50 to-transparent pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-[#09090B]/85 backdrop-blur-xl z-[85] lg:hidden pointer-events-none" />

      <div className="relative z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-10 pt-[calc(env(safe-area-inset-top)+5rem)] lg:pt-32 pb-20">

          <div className="flex flex-col items-center justify-center text-center mb-8 lg:mb-12 pt-0 lg:pt-6">

            <div className="relative w-full max-w-4xl mx-auto mb-4 lg:mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 md:h-6 md:w-6 text-white/50" />
              </div>
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-[#1c1c1e]/80 text-white font-medium text-base md:text-lg placeholder:text-white/40 rounded-full py-4 md:py-5 pl-12 md:pl-16 pr-24 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#E53945]/50 focus:border-[#E53945]/50 shadow-2xl transition-all"
                placeholder="Search creators, live, shorts, videos, podcasts..."
                value={query}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 120)}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch(query);
                  if (e.key === "Escape") { setIsFocused(false); (e.target as HTMLInputElement).blur(); }
                }}
              />
              <div className="absolute inset-y-0 right-0 pr-3 md:pr-4 flex items-center gap-2">
                {query && (
                  <button onClick={() => { setQuery(""); router.replace("/search"); inputRef.current?.focus(); }} className="bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition" aria-label="Clear">
                    <X className="h-4 w-4 text-white" />
                  </button>
                )}
                <button onClick={() => applySearch(query)} className="bg-[#E53945] hover:bg-[#d12e39] text-white rounded-full px-4 py-2 text-sm font-bold transition">
                  Search
                </button>
              </div>

              {/* Suggestions / Recent dropdown */}
              {isFocused && (query.trim().length > 0 || recentSearches.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-[#111114]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-left z-20">
                  {query.trim().length === 0 && recentSearches.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2"><Clock size={13} /> Recent searches</span>
                        <button onClick={clearRecentSearches} className="text-xs text-white/40 hover:text-white transition">Clear</button>
                      </div>
                      {recentSearches.map((term) => (
                        <button key={term} onMouseDown={(e) => e.preventDefault()} onClick={() => applySearch(term)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition text-sm text-white/80">
                          <Clock size={15} className="text-white/35" />
                          <span className="truncate">{term}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {query.trim().length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2"><Sparkles size={13} /> Suggestions</div>
                      {suggestions.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-white/50">No quick matches yet. Press Enter to search.</div>
                      ) : suggestions.map((s, i) => (
                        s.type === "creator" && s.href ? (
                          <Link key={`${s.type}-${s.label}-${i}`} href={s.href} onMouseDown={() => saveRecentSearch(query)} onClick={() => setIsFocused(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><User size={14} className="text-white/70" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-white truncate">{s.label}</div>
                              <div className="text-xs text-white/45 truncate">{s.sub}</div>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-white/35">Creator</span>
                          </Link>
                        ) : (
                          <button key={`${s.type}-${s.label}-${i}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { saveRecentSearch(query); if (s.video) { setIsFocused(false); if (isShortVideo(s.video)) router.push(`/feed?reel=${s.video.id}`); else router.push(`/watch/${s.video.id}`); } else applySearch(s.label); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition text-left">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              {s.sub === "Live" ? <Radio size={14} className="text-[#E53945]" /> : s.sub === "Short" ? <Clapperboard size={14} className="text-white/70" /> : s.sub === "Podcast" ? <Mic size={14} className="text-white/70" /> : <Film size={14} className="text-white/70" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-white truncate">{s.label}</div>
                              <div className="text-xs text-white/45 truncate">{s.sub}</div>
                            </div>
                          </button>
                        )
                      ))}
                      <button onMouseDown={(e) => e.preventDefault()} onClick={() => applySearch(query)} className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition text-sm text-[#ff8f98] font-semibold">
                        <Search size={15} /> Search for "{query}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 text-xs md:text-sm text-white/50">
              <span className="flex items-center gap-1.5"><TrendingUp size={16} className="text-[#E53945]" /> Trending:</span>
              {TRENDING_TAGS.map((tag) => (
                <button key={tag} onClick={() => applySearch(tag)} className="hover:text-white transition">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {query.trim().length > 0 ? (
            <div className="w-full">
              <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                  Results for <span className="text-[#E53945]">"{query}"</span>
                </h2>
                <div className="flex items-center gap-2 bg-[#1c1c1e] p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto scrollbar-hide">
                  {filterTabs.map((f) => (
                    <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition whitespace-nowrap ${activeFilter === f.key ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>
                      {f.label} {typeof f.count === "number" ? `(${f.count})` : ""}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-6 animate-pulse">
                  {[0,1,2,3,4,5].map(i => <div key={i} className="aspect-video rounded-xl bg-white/[0.06]" />)}
                </div>
              ) : !hasResults ? (
                <div className="text-center py-16 bg-[#1c1c1e] rounded-3xl border border-white/5 flex flex-col items-center justify-center">
                  <Filter size={48} className="text-white/10 mb-4" />
                  <p className="text-white/60 text-lg">No results found for "{query}"</p>
                  <p className="text-white/35 text-sm mt-2 max-w-md">Try a different spelling, fewer words, or search by creator name, topic, or category.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {showCreators && filteredProfiles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Creators</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {filteredProfiles.map((profile) => (
                          <Link key={profile.user_id} href={`/profile/${profile.username}`} onClick={() => saveRecentSearch(query)} className="flex items-center gap-3 md:gap-4 bg-[#1c1c1e] border border-white/5 hover:border-white/20 p-3 md:p-4 rounded-2xl transition group">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-[#09090B] shrink-0 border border-white/10">
                              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-lg text-white/50">{(profile.display_name || profile.username || "?")[0]}</div>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-bold text-sm md:text-base truncate group-hover:text-[#E53945] transition-colors">{profile.display_name || "User"}</span>
                                {(profile as any).verification_tick && (profile as any).verification_tick !== "none" && <VerifiedBadge size={14} variant={(profile as any).verification_tick as any} />}
                              </div>
                              <span className="text-xs md:text-sm text-white/50 truncate block">@{profile.username || "user"}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {showVideos && filteredVideos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">
                        {activeFilter === "live" ? "Live" : activeFilter === "shorts" ? "Shorts" : activeFilter === "podcasts" ? "Podcasts" : activeFilter === "videos" ? "Videos" : "Videos & Shorts"}
                      </h3>
                      <div className={activeFilter === "shorts" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5"}>
                        {filteredVideos.map((video) => {
                          const short = isShortVideo(video);
                          const live = isLiveVideo(video);
                          const href = short ? `/feed?reel=${video.id}` : `/watch/${video.id}`;
                          return (
                            <Link key={video.id} href={href} onClick={() => saveRecentSearch(query)} className="flex flex-col group">
                              <div className={`relative ${short ? "aspect-[9/16]" : "aspect-video"} rounded-xl overflow-hidden bg-[#1c1c1e] mb-2 md:mb-3 border border-white/5 shadow-lg`}>
                                <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                                {live && <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-[#E53945] text-white px-2 py-0.5 rounded-full">Live</span>}
                                {short && <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded-full border border-white/10">Short</span>}
                                {isPodcastVideo(video) && !short && <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded-full border border-white/10">Podcast</span>}
                              </div>
                              <span className="text-xs md:text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{video.title}</span>
                              <span className="text-[10px] md:text-xs text-white/50 mt-1">{video.type || "Video"}{video.category ? ` • ${video.category}` : ""}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 lg:space-y-12">
              {recentSearches.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Clock size={18} className="text-white/50" /> Recent searches</h2>
                    <button onClick={clearRecentSearches} className="text-xs md:text-sm font-bold text-white/50 hover:text-white transition">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button key={term} onClick={() => applySearch(term)} className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-sm text-white/80 transition">
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-8">What would you like to watch?</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  {PRIMARY_CATEGORIES.map((cat) => (
                    <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className="group relative h-28 md:h-40 rounded-2xl overflow-hidden border border-white/10 block">
                      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      <div className={`absolute inset-0 ${cat.color} mix-blend-multiply opacity-80 group-hover:opacity-60 transition-opacity`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-3 md:p-6 flex items-center justify-between w-full">
                        <h3 className="text-lg md:text-2xl font-black text-white drop-shadow-lg">{cat.name}</h3>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                          <ChevronRight size={16} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <div className="w-full h-px bg-white/5" />

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-8">Browse by category</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                  {GENRE_CATEGORIES.map((cat) => (
                    <Link key={cat.name} href={`/search/${encodeURIComponent(cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`} className="group relative h-28 md:h-40 rounded-2xl overflow-hidden border border-white/10 block">
                      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      <div className={`absolute inset-0 ${cat.color} mix-blend-multiply opacity-80 group-hover:opacity-60 transition-opacity`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-3 md:p-6 flex items-center justify-between w-full">
                        <h3 className="text-lg md:text-2xl font-black text-white drop-shadow-lg">{cat.name}</h3>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                          <ChevronRight size={16} className="text-white" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {trendingDocs.length > 0 && (
                <>
                  <div className="w-full h-px bg-white/5" />
                  <section>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-bold">Trending Documentaries</h2>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-6">
                      {trendingDocs.map((v) => (
                        <Link key={v.id} href={`/watch/${v.id}`} className="group flex flex-col">
                          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1c1c1e] mb-2 md:mb-3 border border-white/5 shadow-lg">
                            <img src={v.posterUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                          </div>
                          <h3 className="text-xs md:text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{v.title}</h3>
                          <p className="text-[10px] md:text-xs text-white/50 mt-1">{v.year}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {popularPodcasts.length > 0 && (
                <>
                  <div className="w-full h-px bg-white/5" />
                  <section>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-bold">Popular Podcasts</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
                      {popularPodcasts.map((v) => (
                        <Link key={v.id} href={`/watch/${v.id}`} className="group flex flex-col bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                          <div className="relative aspect-square overflow-hidden bg-[#09090B]">
                            <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                          </div>
                          <div className="p-3 md:p-4">
                            <h3 className="text-sm md:text-base font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition-colors">{v.title}</h3>
                            <p className="text-[10px] md:text-xs text-white/50 mt-1 md:mt-2">{v.type} • {v.category}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {popularCreators.length > 0 && (
                <>
                  <div className="w-full h-px bg-white/5" />
                  <section>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-bold">Popular Creators</h2>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
                      {popularCreators.map((c) => (
                        <Link key={c.user_id} href={`/profile/${c.username}`} className="flex flex-col items-center text-center group">
                          <div className="w-16 h-16 md:w-24 md:h-24 rounded-full p-[2px] bg-[#E53945] group-hover:scale-105 transition-transform mb-2 md:mb-3">
                            <div className="w-full h-full rounded-full border-2 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                              {c.avatar_url ? <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg md:text-2xl font-bold text-white">{(c.display_name || "?")[0]?.toUpperCase()}</div>}
                            </div>
                          </div>
                          <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-[#E53945] transition-colors truncate w-full">{c.display_name || c.username}</h3>
                          <p className="text-[10px] md:text-xs text-white/50 mt-0.5 md:mt-1">Creator</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

        </div>

        <MobileBottomNav />
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
