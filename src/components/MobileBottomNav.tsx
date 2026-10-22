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
  { customImage: "/icons/licon.jpg", label: "Home", path: "/" },
  { icon: Play, label: "Feed", path: "/feed" },
  { icon: Podcast, label: "Podcasts", path: "/podcasts" },
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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    TABS.forEach(tab => router.prefetch(tab.path));
    router.prefetch("/profile");
    router.prefetch("/login");
  }, [router]);

  useEffect(() => {
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
  }, [pathname]);

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
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-28 right-6 z-[100] bg-[#1c1c1e] border border-white/10 rounded-2xl p-2 w-48 shadow-2xl"
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition"
              >
                <LogOut size={18} /> Log Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Glass Pill Container */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-around w-[92%] max-w-sm mb-4 px-2 py-2 bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          
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
                className="flex flex-col items-center justify-center w-12 h-12 rounded-full"
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

          {/* Profile Avatar */}
          <div
            onClick={handleAvatarClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer"
          >
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  draggable={false}
                  style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
                  className={`w-7 h-7 rounded-full object-cover ${
                    profileActive ? "ring-2 ring-white" : "ring-1 ring-white/30"
                  }`}
                />
              ) : signedIn === false ? (
                <div className={`w-7 h-7 rounded-full bg-white/10 flex items-center justify-center ${profileActive ? "ring-2 ring-white" : ""}`}>
                  <span className="w-3 h-3 rounded-full border-2 border-white/70" />
                </div>
              ) : (
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[10px] font-bold ${
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
