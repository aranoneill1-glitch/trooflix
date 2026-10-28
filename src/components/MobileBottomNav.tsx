"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Search, LogOut, Home } from "lucide-react";
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
  
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Listen for player open/close events to hide the nav
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
    router.prefetch("/search");
    router.prefetch(isCreator ? "/creator-dashboard" : "/plus");
    router.prefetch("/profile");
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
          // LIVE ROLE CHECK: Check if the user is a creator
          if (d.profile?.role === 'creator' || d.profile?.is_creator === true) {
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

  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

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
    router.push(signedIn === false ? "/login" : "/profile");
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
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              >
                <LogOut size={18} /> Log Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[250] flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-around w-[85%] max-w-[320px] mb-8 px-2 py-1.5 bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          
          <Link
            href="/"
            onClick={() => Capacitor.isNativePlatform() && Haptics.impact({ style: ImpactStyle.Light })}
            className="flex flex-col items-center justify-center w-12 h-10 rounded-full"
          >
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              <Home size={24} className={isActive("/") ? "text-white" : "text-white/60 hover:text-white/80"} />
            </motion.div>
          </Link>

          <Link
            href="/search"
            onClick={() => Capacitor.isNativePlatform() && Haptics.impact({ style: ImpactStyle.Light })}
            className="flex flex-col items-center justify-center w-12 h-10 rounded-full"
          >
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              <Search size={24} className={isActive("/search") ? "text-white" : "text-white/60 hover:text-white/80"} />
            </motion.div>
          </Link>

          {/* DYNAMIC TAB: PLUS vs CREATOR */}
          <Link
            href={isCreator ? "/creator-dashboard" : "/plus"}
            onClick={() => Capacitor.isNativePlatform() && Haptics.impact({ style: ImpactStyle.Light })}
            className="flex flex-col items-center justify-center w-14 h-10 rounded-full"
          >
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              <div className="flex flex-col items-center justify-center leading-none pt-1">
                <span className="text-[10px] font-black text-white tracking-tight">TROOFLIX</span>
                <span className={`text-[8px] font-bold tracking-[0.2em] uppercase mt-1 ${isCreator ? 'text-blue-400' : 'text-[#E53945]'}`}>
                  {isCreator ? "Creator" : "Plus"}
                </span>
              </div>
            </motion.div>
          </Link>

          <div
            onClick={handleAvatarClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            className="flex flex-col items-center justify-center w-12 h-10 rounded-full cursor-pointer select-none"
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          >
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  draggable={false}
                  style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
                  className={`w-7 h-7 rounded-xl object-cover ${
                    profileActive ? "ring-2 ring-white" : "ring-1 ring-white/30"
                  }`}
                />
              ) : signedIn === false ? (
                <div className={`w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center ${profileActive ? "ring-2 ring-white" : ""}`}>
                  <span className="w-3 h-3 rounded-full border-2 border-white/70" />
                </div>
              ) : (
                <div
                  className={`w-7 h-7 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[10px] font-bold ${
                    profileActive ? "ring-2 ring-white" : ""
                  }`}
                >
                  •
                </div>
              )}
            </motion.div>
          </div>
          
        </div>
      </nav>
    </>
  );
}
