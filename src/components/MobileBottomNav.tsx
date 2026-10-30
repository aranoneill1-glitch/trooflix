"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Search, LogOut, Home, Video, MessageCircle, Radio, X, ShoppingBag, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isTVApp, setIsTVApp] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [isCreator, setIsCreator] = useState(false); 
  
  // Create Menu State
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const handleOpen = () => setIsPlayerOpen(true);
    const handleClose = () => setIsPlayerOpen(false);
    document.addEventListener("player-open", handleOpen);
    document.addEventListener("player-close", handleClose);
    return () => {
      document.removeEventListener("player-open", handleOpen);
      document.removeEventListener("player-close", handleClose);
    };
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      setIsTVApp(true);
    }
  }, []);

  useEffect(() => {
    if (isTVApp) return;
    router.prefetch("/");
    router.prefetch("/feed");
    router.prefetch("/search");
    router.prefetch(isCreator ? "/creator-dashboard" : "/plus");
    router.prefetch("/messages");
    router.prefetch("/login");
  }, [router, isTVApp, isCreator]);

  useEffect(() => {
    if (isTVApp) return;
    const supabase = createClient();
    getCachedUser().then((user) => {
      if (!user) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      fetch(`/api/profile?user_id=${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url);
          const tier = d.profile?.tier?.toLowerCase();
          if (tier === 'creator' || tier === 'podcaster' || tier === 'pro') {
            setIsCreator(true);
          } else {
            setIsCreator(false);
          }
        })
        .catch(() => {});
    });
  }, [pathname, isTVApp]);

  if (isTVApp || isPlayerOpen) return null;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  const profileActive = pathname === "/creator-dashboard" || pathname.startsWith("/creator-dashboard");

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    setShowLogoutMenu(false);
    router.push("/");
    router.refresh();
  };

  const startPress = () => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light });
      setShowLogoutMenu(true);
    }, 600);
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      isLongPress.current = false;
      return;
    }
    router.push(signedIn === false ? "/login" : "/creator-dashboard?view=public");
  };

  return (
    <>
      <AnimatePresence>
        {showLogoutMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutMenu(false)}
              className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-28 right-6 z-[301] bg-[#1c1c1e] border border-white/10 rounded-2xl p-2 w-48 shadow-2xl select-none"
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition select-none"
              >
                <LogOut size={18} /> Log Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Create New</h3>
                <button onClick={() => setShowCreateMenu(false)} className="p-2 bg-white/10 rounded-full">
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
                    <h4 className="font-bold">Upload Video / Podcast</h4>
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
                    <h4 className="font-bold">Go Live</h4>
                    <p className="text-xs text-white/50">Stream a live Q&A with your fans</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[250] flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
        
        {/* THE RAINDROP / LIQUID GLASS TAB BAR (Increased max-width to fit 6 tabs) */}
        <div className="pointer-events-auto flex items-center justify-around w-[94%] max-w-[420px] mb-8 px-2 py-1.5 bg-gradient-to-b from-white/10 to-white/[0.02] backdrop-blur-[40px] backdrop-saturate-[180%] backdrop-brightness-[1.2] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(255,255,255,0.1)]">
          
          {/* TAB 1: HOME */}
          <Link href="/" className="flex items-center justify-center w-12 h-10 rounded-full">
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center">
              <Home size={22} className={isActive("/") ? "text-white" : "text-white/60 hover:text-white/80"} />
            </motion.div>
          </Link>

          {/* TAB 2: SHORTS (NEW) */}
          <Link href="/feed" className="flex items-center justify-center w-12 h-10 rounded-full">
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center">
              <Play size={22} className={isActive("/feed") ? "text-white" : "text-white/60 hover:text-white/80"} fill={isActive("/feed") ? "currentColor" : "none"} />
            </motion.div>
          </Link>

          {/* TAB 3: EXPLORE */}
          <Link href="/search" className="flex items-center justify-center w-12 h-10 rounded-full">
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center">
              <Search size={22} className={isActive("/search") ? "text-white" : "text-white/60 hover:text-white/80"} />
            </motion.div>
          </Link>

          {/* TAB 4: DYNAMIC CENTER (CREATE / PLUS) */}
          {isCreator ? (
            <div
              onClick={() => {
                setShowCreateMenu(true);
                if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Medium });
              }}
              className="flex items-center justify-center w-12 h-10 rounded-full cursor-pointer"
            >
              <motion.div whileTap={{ scale: 0.9 }} className="flex items-center justify-center">
                <Video size={24} className="text-white" strokeWidth={2} />
              </motion.div>
            </div>
          ) : (
            <Link
              href="/plus"
              className="flex items-center justify-center w-12 h-10 rounded-full"
            >
              <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center h-full w-full">
                <div className="flex items-center justify-center">
                  <span className="text-[20px] font-extrabold tracking-tighter text-white">T</span>
                  <span className="text-[20px] font-extrabold tracking-tighter text-[#E53945]">F</span>
                </div>
              </motion.div>
            </Link>
          )}

          {/* TAB 5: DYNAMIC (MESSAGES FOR CREATOR / STORE FOR VIEWER) */}
          {isCreator ? (
            <Link href="/messages" className="flex items-center justify-center w-12 h-10 rounded-full">
              <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center">
                <MessageCircle size={22} className={isActive("/messages") ? "text-white" : "text-white/60 hover:text-white/80"} />
              </motion.div>
            </Link>
          ) : (
            <Link href="/merchandise" className="flex items-center justify-center w-12 h-10 rounded-full">
              <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center">
                <ShoppingBag size={22} className={isActive("/merchandise") ? "text-white" : "text-white/60 hover:text-white/80"} />
              </motion.div>
            </Link>
          )}

          {/* TAB 6: DYNAMIC FAR RIGHT (CREATOR DASHBOARD / PROFILE AVATAR) */}
          {isCreator ? (
            <Link
              href="/creator-dashboard"
              className="flex items-center justify-center w-12 h-10 rounded-full"
            >
              <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center h-full w-full">
                <div className="flex items-center justify-center">
                  <span className="text-[20px] font-extrabold tracking-tighter text-white">T</span>
                  <span className="text-[20px] font-extrabold tracking-tighter text-[#E53945]">F</span>
                </div>
              </motion.div>
            </Link>
          ) : (
            <div
              onClick={handleAvatarClick}
              onMouseDown={startPress}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={startPress}
              onTouchEnd={cancelPress}
              onTouchCancel={cancelPress}
              className="flex items-center justify-center w-12 h-10 rounded-full cursor-pointer select-none"
            >
              <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className={`w-7 h-7 rounded-lg object-cover ${profileActive ? "ring-2 ring-white" : "ring-1 ring-white/30"}`} />
                ) : signedIn === false ? (
                  <div className={`w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center ${profileActive ? "ring-2 ring-white" : ""}`}>
                    <span className="w-3 h-3 rounded-full border-2 border-white/70" />
                  </div>
                ) : (
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[12px] font-bold ${profileActive ? "ring-2 ring-white" : ""}`}>•</div>
                )}
              </motion.div>
            </div>
          )}
          
        </div>
      </nav>
    </>
  );
}
