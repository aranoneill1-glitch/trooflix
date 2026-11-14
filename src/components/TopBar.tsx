"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Mic, Plus, RefreshCw, Video, Radio, X, Play, Tag, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import PWAInstallButton from "@/components/PWAInstallButton";
import { getCachedUser } from "@/lib/cache";

type Props = {
  onMenu?: () => void;
};

export default function TopBar({ onMenu }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Check if we are on the search page
  const isSearchPage = pathname === "/search";
  const isMessagesPage = pathname === "/messages";

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

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

  return (
    <>
      <nav
        className={`fixed left-0 lg:left-[72px] right-0 z-[200] flex items-center gap-3 px-4 md:px-6 h-[56px] transition-all duration-300 ${
          scrolled
            ? "bg-[#070709] border-b border-white/[0.06]"
            : "bg-transparent border-b border-transparent"
        }`}
        style={{ top: "env(safe-area-inset-top)" }}
      >
        {onMenu && (
          <button
            onClick={onMenu}
            className="lg:hidden text-white/90 hover:text-white transition"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        )}

        {/* LOGO: Hidden on search page, visible everywhere else */}
        {!isSearchPage && (
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
        )}

        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          <PWAInstallButton />

          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
            aria-label="Refresh App"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateMenu(true)}
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition"
            aria-label="Add content"
          >
            <Plus size={20} />
          </button>
          <Link href="/merchandise" className="hidden lg:flex w-9 h-9 rounded-full items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition" aria-label="Shop">
            <ShoppingBag size={18} />
          </Link>

          <NotificationBell hideTrigger />

          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* CREATE / ADD CONTENT BOTTOM SHEET */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateMenu(false)}
              className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-white/10 backdrop-blur-2xl backdrop-saturate-150 rounded-t-[32px] border-t border-white/20 p-6 pb-28 lg:max-w-md lg:mx-auto lg:rounded-[32px] lg:bottom-10 shadow-[0_-20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mb-6 lg:hidden" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white tracking-tight">Add Content</h3>
                <button onClick={() => setShowCreateMenu(false)} className="p-2.5 bg-white/10 rounded-full hover:bg-white/15 transition text-white border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <Link 
                  href="/creator-dashboard/upload" 
                  onClick={() => setShowCreateMenu(false)}
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-white/25 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
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
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-blue-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
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
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-blue-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
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
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-[#E53945]/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
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
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-purple-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
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
