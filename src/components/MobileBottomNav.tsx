"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Play, MessageCircle, Podcast, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";

const TABS: {
  icon?: any;
  customImage?: string;
  label: string;
  path: string;
}[] = [
  { customImage: "/icons/lgo.png", label: "Home", path: "/" },
  { icon: Play, label: "Feed", path: "/feed" },
  { icon: Podcast, label: "Creators", path: "/creators" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

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

  if (isTVApp) return null;

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
              className="fixed bottom-28 right-6 z-[301] bg-[#0f172a]/95 backdrop-blur-3xl border border-blue-500/30 rounded-2xl p-2 w-48 shadow-[0_0_30px_rgba(59,130,246,0.2)] select-none"
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-400 font-bold hover:bg-red-500/10 rounded-xl transition select-none"
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              >
                <LogOut size={18} /> Log Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TERAFAB-INSPIRED FLOATING DOCK */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[250] flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-around w-[92%] max-w-sm mb-4 px-2 py-2 bg-gradient-to-r from-[#0a122e]/90 to-[#05081c]/90 backdrop-blur-3xl border border-blue-500/20 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.15)]">
          
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
                className="flex flex-col items-center justify-center w-12 h-12 rounded-full relative group"
              >
                <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  {tab.customImage ? (
                    <img
                      src={tab.customImage}
                      alt=""
                      draggable={false}
                      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
                      className={`w-[26px] h-[26px] object-contain transition-all duration-300 ${
                        active ? "opacity-100 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "opacity-50 hover:opacity-80 grayscale"
                      }`}
                    />
                  ) : (
                    <tab.icon
                      size={26}
                      className={`transition-all duration-300 ${
                        active ? "text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "text-white/40 hover:text-white/70"
                      }`}
                    />
                  )}
                </motion.div>
                {/* Active Glow Dot */}
                {active && (
                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,1)]" />
                )}
              </Link>
            );
          })}

          {/* Profile Avatar */}
          <div
            onClick={handleAvatarClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer select-none"
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          >
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  draggable={false}
                  style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
                  className={`w-7 h-7 rounded-full object-cover transition-all duration-300 ${
                    profileActive 
                      ? "ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]" 
                      : "ring-1 ring-white/20 grayscale hover:grayscale-0"
                  }`}
                />
              ) : signedIn === false ? (
                <div className={`w-7 h-7 rounded-full bg-white/10 flex items-center justify-center transition-all ${
                  profileActive ? "ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]" : ""
                }`}>
                  <span className="w-3 h-3 rounded-full border-2 border-white/70" />
                </div>
              ) : (
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-[10px] font-bold transition-all ${
                    profileActive ? "ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]" : ""
                  }`}
                >
                  •
                </div>
              )}
            </motion.div>
            {profileActive && (
              <span className="absolute bottom-0 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,1)]" />
            )}
          </div>
          
        </div>
      </nav>
    </>
  );
}
