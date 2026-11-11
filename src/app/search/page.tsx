"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Play, User, TrendingUp, ChevronRight, Filter } from "lucide-react";
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
  { name: "War & Conflict", color: "bg-[#E53945]/60", image: "https://images.unsplash.com/photo-1579912205439-4cef16dc975e?q=80&w=600&auto=format&fit=crop" },
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

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(!!initialQuery);

  // Listen for changes in the URL (e.g., if they search from the top bar while already on the search page)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setQuery(q);
      setIsSearching(!!q);
    }
  }, [searchParams]);
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
        .select("user_id, creator_id, display_name, username, avatar_url, is_verified, verification_tick, tier, bio")
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
    
    const results = allVideos.filter(v => v.type?.toLowerCase() !== "tweet" && v.type?.toLowerCase() !== "short").map(v => {
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

  const showVideos = activeFilter === "all" || activeFilter === "videos";
  const showCreators = activeFilter === "all" || activeFilter === "creators";
  const hasResults = (showVideos && filteredVideos.length > 0) || (showCreators && filteredProfiles.length > 0);

  const trendingDocs = allVideos.filter(v => v.type === 'Documentary').slice(0, 6);
  const popularPodcasts = allVideos.filter(v => v.type === 'Podcast').slice(0, 5);
  const popularCreators = allProfiles.filter(p => p.tier === 'creator' || p.creator_id).slice(0, 8);

  const categoryHref = (name: string) => `/search/${encodeURIComponent(name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"))}`;
  const featuredDoc = trendingDocs[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08090c] pb-28 font-sans text-white">
      <TopBar />
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[620px] bg-[radial-gradient(ellipse_at_72%_0%,rgba(229,57,69,0.16),transparent_42%),linear-gradient(180deg,rgba(22,23,28,0.75),transparent)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1540px] px-4 pb-12 pt-[88px] sm:px-6 lg:px-10 lg:pt-[104px]">
        <section className={`relative isolate overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#111216] shadow-[0_28px_90px_rgba(0,0,0,0.32)] ${query ? "mb-8 px-5 py-6 md:px-8 md:py-7" : "mb-10 px-5 py-7 md:mb-14 md:px-10 md:py-10"}`}>
          <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_15%_25%,rgba(229,57,69,0.17),transparent_42%),linear-gradient(115deg,#14151a_0%,#101115_56%,#171216_100%)]" />
          {featuredDoc && !query && (featuredDoc.backdropUrl || featuredDoc.posterUrl) && (
            <img src={featuredDoc.backdropUrl || featuredDoc.posterUrl} alt="" className="absolute inset-y-0 right-0 -z-10 hidden h-full w-[58%] object-cover object-center opacity-40 [mask-image:linear-gradient(to_right,transparent,black_45%)] md:block" />
          )}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#111216] via-[#111216]/90 to-[#111216]/25" />

          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.52fr)] md:gap-10">
            <div className="max-w-3xl">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white/55 md:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E53945] shadow-[0_0_12px_rgba(229,57,69,0.9)]" />
                Independent stories. Different perspectives.
              </p>
              <h1 className={`max-w-2xl font-black tracking-[-0.055em] text-white ${query ? "mb-2 text-2xl md:text-4xl" : "mb-3 text-[2.5rem] leading-[0.98] sm:text-5xl md:text-6xl"}`}>
                {query ? "Find your next favorite." : <>Stories worth<br className="hidden sm:block" /> staying up for.</>}
              </h1>
              {!query && <p className="mb-6 max-w-xl text-sm leading-6 text-white/60 md:mb-7 md:text-base">Explore documentaries, independent films, podcasts and voices you won’t find anywhere else.</p>}

              <div className="relative flex max-w-2xl items-center rounded-2xl border border-white/[0.12] bg-black/35 shadow-[0_14px_45px_rgba(0,0,0,0.25)] backdrop-blur-xl transition focus-within:border-[#E53945]/60 focus-within:ring-4 focus-within:ring-[#E53945]/10">
                <Search aria-hidden="true" className="ml-4 h-5 w-5 shrink-0 text-white/45 md:ml-5" />
                <input
                  type="search"
                  aria-label="Search titles, subjects, and creators"
                  className="h-14 min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-white outline-none placeholder:text-white/40 md:h-[62px] md:px-4 md:text-base"
                  placeholder="Search titles, subjects, creators..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setIsSearching(true); }}
                />
                {query && <button type="button" onClick={handleCancel} aria-label="Clear search" className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>}
                {!query && <span className="mr-3 hidden rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/35 lg:inline">SEARCH</span>}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-white/45"><TrendingUp size={14} className="text-[#E85B64]" /> Trending</span>
                {TRENDING_TAGS.map((tag) => (
                  <button key={tag} onClick={() => handleTagClick(tag)} className="rounded-full border border-white/[0.09] bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white md:text-xs">{tag}</button>
                ))}
              </div>
            </div>

            {featuredDoc && !query && (
              <Link href={`/watch/${featuredDoc.id}`} className="group relative hidden min-h-[210px] items-end overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 shadow-2xl transition hover:border-white/25 md:flex lg:min-h-[250px]">
                <img src={featuredDoc.backdropUrl || featuredDoc.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                <div className="relative z-10">
                  <span className="mb-2 inline-flex rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/75 backdrop-blur">Featured documentary</span>
                  <h2 className="line-clamp-2 text-xl font-bold leading-tight text-white lg:text-2xl">{featuredDoc.title}</h2>
                  <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white/75 transition group-hover:text-white"><Play size={13} fill="currentColor" /> Explore the story</span>
                </div>
              </Link>
            )}
          </div>
        </section>

        {query.length > 0 ? (
          <section className="min-h-[45vh]">
            <div className="mb-7 flex flex-col gap-4 border-b border-white/[0.08] pb-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Search results</p>
                <h2 className="truncate text-xl font-bold md:text-2xl">For <span className="text-[#F06A72]">“{query}”</span></h2>
              </div>
              <div className="flex w-full gap-1 rounded-xl border border-white/[0.08] bg-white/[0.035] p-1 md:w-auto">
                {([
                  ["all", `All ${filteredVideos.length + filteredProfiles.length}`],
                  ["videos", `Videos ${filteredVideos.length}`],
                  ["creators", `Creators ${filteredProfiles.length}`],
                ] as const).map(([filter, label]) => (
                  <button key={filter} onClick={() => setActiveFilter(filter)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition md:flex-none md:px-4 ${activeFilter === filter ? "bg-white/[0.12] text-white shadow-sm" : "text-white/45 hover:text-white/80"}`}>{label}</button>
                ))}
              </div>
            </div>

            {!hasResults ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.025] px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><Filter size={22} className="text-white/45" /></div>
                <p className="text-base font-semibold text-white/80">Nothing matched “{query}”</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/40">Try a broader topic, a creator name, or one of the trending searches above.</p>
                <button onClick={handleCancel} className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-white/85">Explore everything</button>
              </div>
            ) : (
              <div className="space-y-10 md:space-y-12">
                {showCreators && filteredProfiles.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Creators & people <span className="ml-1 text-white/25">{filteredProfiles.length}</span></h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredProfiles.map((profile) => (
                        <Link key={profile.user_id} href={`/profile/${profile.username}`} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#111216] p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#17181d]">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#202127] ring-1 ring-white/10 md:h-16 md:w-16">
                            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white/45">{profile.display_name?.[0] || <User size={22} />}</div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-white transition group-hover:text-[#F06A72] md:text-base">{profile.display_name || "User"}</span>
                              {(profile as any).verification_tick && (profile as any).verification_tick !== "none" && <VerifiedBadge size={14} variant={(profile as any).verification_tick as any} />}
                            </div>
                            <span className="mt-0.5 block truncate text-xs text-white/45">@{profile.username || "user"}</span>
                          </div>
                          <ChevronRight size={17} className="mr-1 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/75" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {showVideos && filteredVideos.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Films, podcasts & more <span className="ml-1 text-white/25">{filteredVideos.length}</span></h3>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredVideos.map((video) => (
                        <Link key={video.id} href={`/watch/${video.id}`} className="group min-w-0">
                          <div className="relative mb-3 aspect-video overflow-hidden rounded-2xl border border-white/[0.08] bg-[#17181d] shadow-lg">
                            {(video.posterUrl || video.backdropUrl) && <img src={video.backdropUrl || video.posterUrl} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10 opacity-70 transition group-hover:opacity-100" />
                            <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/85 backdrop-blur">{video.type || "Video"}</span>
                            <span className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-1 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><Play size={15} fill="currentColor" className="ml-0.5" /></span>
                          </div>
                          <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white transition group-hover:text-[#F06A72] md:text-base">{video.title}</h4>
                          <p className="mt-1.5 truncate text-xs text-white/45">{video.category || "Independent story"}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-10 md:space-y-14">
            <section>
              <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
                <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Find your kind of story</p><h2 className="text-xl font-bold md:text-2xl">Explore the platform</h2></div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {PRIMARY_CATEGORIES.map((cat, index) => (
                  <Link key={cat.name} href={categoryHref(cat.name)} className="group relative isolate aspect-[1.35] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#17181d] shadow-lg transition duration-300 hover:-translate-y-1 hover:border-white/20 md:aspect-[1.55] md:rounded-3xl">
                    <img src={cat.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className={`absolute inset-0 -z-10 ${cat.color} opacity-35 transition group-hover:opacity-20`} />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/15 to-black/5" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 md:p-5">
                      <div><span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">0{index + 1} / Discover</span><h3 className="text-base font-extrabold leading-tight text-white drop-shadow md:text-xl">{cat.name}</h3></div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur transition group-hover:translate-x-0 group-hover:opacity-100"><ChevronRight size={16} /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 md:mb-5"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Follow a curiosity</p><h2 className="text-xl font-bold md:text-2xl">Browse by topic</h2></div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {GENRE_CATEGORIES.map((cat) => (
                  <Link key={cat.name} href={categoryHref(cat.name)} className="group flex shrink-0 items-center gap-2.5 rounded-full border border-white/[0.09] bg-white/[0.035] py-2 pl-2 pr-4 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white md:py-2.5 md:pl-2.5 md:pr-5 md:text-sm">
                    <span className={`h-7 w-7 rounded-full ${cat.color} opacity-80 ring-1 ring-white/10 transition group-hover:scale-105 md:h-8 md:w-8`} />{cat.name}
                  </Link>
                ))}
              </div>
            </section>

            {trendingDocs.length > 0 && (
              <section>
                <div className="mb-4 md:mb-5"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E85B64]">Worth your time</p><h2 className="text-xl font-bold md:text-2xl">Trending documentaries</h2></div>
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {trendingDocs.map((v, index) => (
                    <Link key={v.id} href={`/watch/${v.id}`} className="group w-[43vw] max-w-[230px] shrink-0 snap-start sm:w-[30vw] md:w-[22vw] lg:w-[17vw] xl:w-[15vw]">
                      <div className="relative mb-3 aspect-[2/3] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#17181d] shadow-xl">
                        {(v.posterUrl || v.backdropUrl) && <img src={v.posterUrl || v.backdropUrl} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">#{index + 1} trending</span>
                        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black opacity-0 transition group-hover:scale-100 group-hover:opacity-100"><Play size={14} fill="currentColor" className="ml-0.5" /></span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition group-hover:text-[#F06A72]">{v.title}</h3>
                      <p className="mt-1 text-xs text-white/40">{v.year || v.category || "Documentary"}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {popularPodcasts.length > 0 && (
              <section>
                <div className="mb-4 md:mb-5"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Listen in</p><h2 className="text-xl font-bold md:text-2xl">Popular podcasts</h2></div>
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {popularPodcasts.map((v) => (
                    <Link key={v.id} href={`/watch/${v.id}`} className="group w-[70vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111216] transition hover:-translate-y-1 hover:border-white/20 sm:w-[43vw] md:w-[32vw] lg:w-[25vw]">
                      <div className="relative aspect-[1.7] overflow-hidden bg-[#17181d]">
                        {(v.backdropUrl || v.posterUrl) && <img src={v.backdropUrl || v.posterUrl} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur"><Play size={10} fill="currentColor" /> Podcast</span>
                      </div>
                      <div className="p-3.5 md:p-4"><h3 className="truncate text-sm font-bold text-white transition group-hover:text-[#F06A72] md:text-base">{v.title}</h3><p className="mt-1.5 truncate text-xs text-white/45">{v.category || "Independent voices"}</p></div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {popularCreators.length > 0 && (
              <section>
                <div className="mb-4 md:mb-5"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">The people behind the stories</p><h2 className="text-xl font-bold md:text-2xl">Meet the creators</h2></div>
                <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {popularCreators.map((c) => (
                    <Link key={c.user_id} href={`/profile/${c.username}`} className="group flex w-[24vw] min-w-[82px] max-w-[132px] shrink-0 snap-start flex-col items-center rounded-2xl px-2 py-4 text-center transition hover:bg-white/[0.04] sm:w-[16vw] md:w-[13vw] lg:w-[11vw]">
                      <div className="mb-3 h-16 w-16 rounded-full bg-gradient-to-br from-[#F06A72] via-[#B72B38] to-[#3b1319] p-[2px] transition duration-300 group-hover:scale-105 md:h-[78px] md:w-[78px]">
                        <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-[#0d0e12] bg-[#1b1c22]">
                          {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white/70">{c.display_name?.[0]?.toUpperCase() || "?"}</div>}
                        </div>
                      </div>
                      <h3 className="w-full truncate text-xs font-bold text-white transition group-hover:text-[#F06A72] md:text-sm">{c.display_name || c.username}</h3>
                      <p className="mt-1 truncate text-[10px] text-white/40">@{c.username || "creator"}</p>
                    </Link>
                  ))}
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
