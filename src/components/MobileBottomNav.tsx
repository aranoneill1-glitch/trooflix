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

const TABS: {
  icon?: any;
  customImage?: string;
  customNode?: any;
  label: string;
  path: string;
}[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { 
    customNode: (
      <div className="flex flex-col items-center justify-center leading-none pt-1">
        <span className="text-[10px] font-black text-white tracking-tight">TROOFLIX</span>
        <span className="text-[8px] font-bold text-[#E53945] tracking-[0.2em] uppercase mt-1">Plus</span>
      </div>
    ), 
    label: "Plus", 
    path: "/plus" 
  },
];

const triggerHaptic = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
  }
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isTVApp, setIsTVApp] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  
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
    TABS.forEach(tab => router.prefetch(tab.path));
    router.prefetch("/profile");
    router.prefetch("/login");
  }, [router, isTVApp]);

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
        })
        .catch(() => {});
    });
  }, [pathname, isTVApp]);

  // Hide completely if TV app OR video player is open
  if (isTVApp || isPlayerOpen) return null;

  const prefetchTab = (path: string) => {
    try {
      // @ts-ignore
      router.prefetch?.(path);
    } catch {}
  };

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
      triggerHaptic();
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
        <div className="pointer-events-auto flex items-center justify-around w-[85%] max-w-[300px] mb-8 px-4 py-1.5 bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          
          {TABS.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                prefetch={true}
                onClick={triggerHaptic}
                onMouseEnter={() => prefetchTab(tab.path)}
                onTouchStart={() => prefetchTab(tab.path)}
                className="flex flex-col items-center justify-center w-11 h-10 rounded-full"
              >
                <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  {tab.customImage ? (
                    <img
                      src={tab.customImage}
                      alt=""
                      draggable={false}
                      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
                      className={`w-[26px] h-[26px] object-contain transition-opacity ${
                        active ? "opacity-100" : "opacity-60 hover:opacity-80"
                      }`}
                    />
                  ) : tab.customNode ? (
                    <div className={`transition-opacity ${active ? "opacity-100" : "opacity-60 hover:opacity-80"}`}>
                      {tab.customNode}
                    </div>
                  ) : (
                    <tab.icon
                      size={26}
                      className={active ? "text-white" : "text-white/60 hover:text-white/80"}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}

          <div
            onClick={handleAvatarClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            className="flex flex-col items-center justify-center w-11 h-10 rounded-full cursor-pointer select-none"
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
