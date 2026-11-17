"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Mic, Plus, RefreshCw, Search, Video, Radio, X, Play, Tag, ShoppingBag, Sparkles, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import PWAInstallButton from "@/components/PWAInstallButton";
import { getCachedUser, getCachedVideos, getSyncCachedVideos, onVideosChange } from "@/lib/cache";

type Props = {
  onMenu?: () => void;
};

export default function TopBar({ onMenu }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!searchOpen) return;
    const refresh = (list: any[]) => {
      const q = searchQuery.trim().toLowerCase();
      const base = Array.isArray(list) ? list : [];
      setSearchResults(q
        ? base.filter((v: any) => String(v.title || "").toLowerCase().includes(q)).slice(0, 30)
        : base.slice().sort((a: any, b: any) => b.id - a.id).slice(0, 30));
    };
    refresh(getSyncCachedVideos() || []);
    getCachedVideos().then(refresh).catch(() => {});
    const off = onVideosChange(refresh);
    return () => { off(); };
  }, [searchOpen, searchQuery]);

  // Check if we are on the search page
  const isSearchPage = pathname === "/search";
  const isMessagesPage = pathname === "/messages";

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  useEffect(() => {
    const openCreateMenu = () => setShowCreateMenu(true);
    document.addEventListener("open-create-menu", openCreateMenu);
    return () => document.removeEventListener("open-create-menu", openCreateMenu);
  }, []);

  useEffect(() => {
    getCachedUser().then((u) => {
      if (u) {
        fetch(`/api/profile?user_id=${u.id}`)
          .then((r) => r.json())
          .then((d) => {
            const tier = d.profile?.tier?.toLowerCase();
            if (tier === 'creator' || tier === 'podcaster' || tier === 'pro') {
              setIsCreator(true);
            }
          })
          .catch(() => {});
      }
    });
  }, []);
  
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isSearchPage) {
      setSearchOpen(false);
      setSearchQuery("");
    } else {
      setSearchOpen(false);
    }
  }, [isSearchPage, pathname]);

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  const submitSearch = (q: string) => {
    const trimmed = q.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    else router.push("/search");
  };

  const closeSearch = () => {
    if (isSearchPage) {
      router.push("/");
    } else {
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 lg:left-[72px] right-0 z-[200] bg-[#070709]"
        style={{ height: "env(safe-area-inset-top)", WebkitTransform: "translateZ(0)", transform: "translateZ(0)" }}
        aria-hidden="true"
      />
      <nav
        className={`fixed left-0 lg:left-[72px] right-0 z-[200] flex items-center gap-3 px-4 md:px-6 h-[56px] pt-1 transition-colors duration-300 ${
          isSearchPage
            ? "bg-[#09090B]/85 backdrop-blur-xl border-b border-white/10"
            : scrolled
              ? "bg-[#070709] border-b border-white/[0.06]"
              : "bg-[#070709] border-b border-white/[0.04]"
        }`}
        style={{ top: "env(safe-area-inset-top)", WebkitTransform: "translateZ(0)", transform: "translateZ(0)" }}
      >
        {searchOpen ? (
          <>
            <button
              type="button"
              onClick={closeSearch}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition shrink-0"
              aria-label={isSearchPage ? "Close search" : "Back"}
            >
              <ArrowLeft size={20} />
            </button>
            <form
              className="flex-1 min-w-0"
              onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); }}
            >
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Trooflix..."
                  className="w-full h-10 bg-white/[0.08] border border-white/10 rounded-full pl-9 pr-9 text-sm text-white placeholder:text-white/40 outline-none focus:outline-none focus:ring-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>
            <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <UserMenu />
              </div>
            </div>
          </>
        ) : (
          <>
            {onMenu && (
              <button
                onClick={onMenu}
                className="lg:hidden text-white/90 hover:text-white transition"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
            )}

            {/* LOGO */}
            <Link href="/" className="text-[20px] md:text-[22px] font-black tracking-[-0.06em] shrink-0 leading-none" style={{ fontFamily: "inherit" }}>
              {isMessagesPage ? (
                <>
                  <span className="text-white">TROO</span>
                  <span className="text-red-600">CHAT</span>
                </>
              ) : (
                <>
                  <span className="text-white">TROO</span>
                  <span className="text-red-600">FLIX</span>
                </>
              )}
            </Link>

            <div className="ml-auto flex items-center gap-0.5 md:gap-1">
              <PWAInstallButton />

              {!isSearchPage && (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition"
                  aria-label="Search"
                >
                  <Search size={18} />
                </button>
              )}

              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                aria-label="Refresh App"
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              </button>

              <Link href="/merchandise" className="hidden lg:flex w-9 h-9 rounded-full items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition" aria-label="Shop">
                <ShoppingBag size={18} />
              </Link>

              <NotificationBell hideTrigger />

              <div className="flex items-center gap-2">
                <UserMenu />
              </div>
            </div>
          </>
        )}
      </nav>

      {/* INSTAGRAM-STYLE SEARCH RESULTS GRID */}
      {searchOpen && !isSearchPage && (
        <div className="fixed left-0 lg:left-[72px] right-0 z-[199] bg-[#070709] border-b border-white/[0.08] max-h-[70vh] overflow-y-auto" style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}>
          <div className="px-4 md:px-6 py-4">
            {searchResults.length === 0 ? (
              <p className="text-center text-sm text-white/40 py-8">No videos found.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {searchResults.map((v: any) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(`/podcast/${v.id}`); }}
                    className="relative aspect-[3/4] overflow-hidden bg-[#141418]"
                  >
                    <img src={v.posterUrl || v.backdropUrl} alt={v.title || ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / ADD CONTENT BOTTOM SHEET */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateMenu(false)}
              className="fixed inset-0 z-[300] bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-[#141419] rounded-t-[32px] border-t border-white/15 p-6 pb-28 lg:max-w-md lg:mx-auto lg:rounded-[32px] lg:bottom-10 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mb-6 lg:hidden" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white tracking-tight">Add Content</h3>
                <button onClick={() => setShowCreateMenu(false)} className="p-2.5 bg-white/10 rounded-full hover:bg-white/15 transition text-white border border-white/15">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <Link 
                  href="/creator-dashboard/upload" 
                  onClick={() => setShowCreateMenu(false)}
                  className="group relative flex items-center gap-4 bg-[#1d1d24] hover:bg-[#24242d] border border-white/10 hover:border-white/20 p-4 rounded-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 border border-white/10">
                    <Video className="text-[#E53945]" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Upload Video</h4>
                    <p className="text-xs text-white/50">Publish a long-form video or documentary</p>
                  </div>
                </Link>

                <Link 
                  href="/creator-dashboard/upload?type=podcast" 
                  onClick={() => setShowCreateMenu(false)}
                  className="group relative flex items-center gap-4 bg-[#1d1d24] hover:bg-[#24242d] border border-white/10 hover:border-blue-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-white/10">
                    <Mic className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Upload Podcast</h4>
                    <p className="text-xs text-white/50">Publish a video or audio podcast episode</p>
                  </div>
                </Link>

                <Link 
                  href="/creator-dashboard/upload?type=short" 
                  onClick={() => setShowCreateMenu(false)}
                  className="group relative flex items-center gap-4 bg-[#1d1d24] hover:bg-[#24242d] border border-white/10 hover:border-blue-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-white/10">
                    <Play className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Upload Short</h4>
                    <p className="text-xs text-white/50">Visible on shorts page and your profile</p>
                  </div>
                </Link>

                <Link 
                  href="/creator-dashboard/live"
                  onClick={() => setShowCreateMenu(false)}
                  className="group relative flex items-center gap-4 bg-[#1d1d24] hover:bg-[#24242d] border border-white/10 hover:border-[#E53945]/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 border border-white/10">
                    <Radio className="text-[#E53945]" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Go Live</h4>
                    <p className="text-xs text-white/50">Stream a live Q&A with your fans</p>
                  </div>
                </Link>

                <Link 
                  href="/creator-dashboard/shop"
                  onClick={() => setShowCreateMenu(false)}
                  className="group relative flex items-center gap-4 bg-[#1d1d24] hover:bg-[#24242d] border border-white/10 hover:border-purple-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-white/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Tag className="text-purple-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Add an Item</h4>
                    <p className="text-xs text-white/50">Add an item to your store</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
