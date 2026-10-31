"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, RefreshCw, Video, Radio, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
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
        className={`fixed top-0 left-0 lg:left-[72px] right-0 z-[200] flex items-center gap-6 px-6 md:px-8 py-4 transition-colors duration-300 ${
          scrolled
            ? "bg-black"
            : "bg-gradient-to-b from-black/90 via-black/60 to-transparent"
        }`}
      >
        {/* Hamburger (Mobile Only) */}
        {onMenu && (
          <button
            onClick={onMenu}
            className="lg:hidden text-white/90 hover:text-white transition"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        )}

        {/* Logo */}
        <Link href="/" className="text-xl md:text-2xl font-black tracking-tight shrink-0">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4 md:gap-5">
          
          {/* Creator Add Button */}
          {isCreator && (
            <button
              onClick={() => setShowCreateMenu(true)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              title="Add Content"
            >
              <Plus size={20} />
            </button>
          )}

          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-white/90 hover:text-white transition disabled:opacity-50"
            aria-label="Refresh App"
          >
            <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          
          <NotificationBell />

          <div className="flex items-center gap-3">
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* CREATE BOTTOM SHEET */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateMenu(false)}
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-12 lg:max-w-md lg:mx-auto lg:rounded-2xl lg:bottom-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Create New</h3>
                <button onClick={() => setShowCreateMenu(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <Link 
                  href="/creator-dashboard/upload" 
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition"
                >
                  <div className="w-12 h-12 rounded-full bg-[#E53945]/20 flex items-center justify-center">
                    <Video className="text-[#E53945]" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Upload Video / Podcast</h4>
                    <p className="text-xs text-white/50">Publish a new piece of content</p>
                  </div>
                </Link>
                
                <Link 
                  href="/creator-dashboard/live"
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition"
                >
                  <div className="w-12 h-12 rounded-full bg-[#E53945]/20 flex items-center justify-center">
                    <Radio className="text-[#E53945]" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Go Live</h4>
                    <p className="text-xs text-white/50">Stream a live Q&A with your fans</p>
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
