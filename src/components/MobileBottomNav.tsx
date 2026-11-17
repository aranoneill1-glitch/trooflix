"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Play, Plus, Wallet, User } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isTVApp, setIsTVApp] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileHref, setProfileHref] = useState("/login");

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
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/AFT|Silk|Android TV|BRAVIA|HbbTV|SmartTV|Tizen|Web0S|FireTV/i.test(ua)) {
        setIsTVApp(true);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await getCachedUser();
        if (!user) {
          if (mounted) {
            setAvatarUrl(null);
            setProfileHref("/login");
          }
          return;
        }
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!mounted) return;
        setAvatarUrl(data?.avatar_url || null);
        setProfileHref("/creator-dashboard?studioTab=profile");
      } catch {
        if (mounted) setProfileHref("/login");
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (isTVApp || isPlayerOpen) return null;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    if (path === "/login") return pathname === "/login";
    return pathname === path || pathname.startsWith(path + "/");
  };

  const profileActive = pathname === "/creator-dashboard" || pathname.startsWith("/creator-dashboard/") || pathname.startsWith("/profile/");

  const isFeed = pathname === "/feed" || pathname.startsWith("/feed/");
  if (isFeed) return null;

  return (
    <nav className={`lg:hidden fixed inset-x-0 bottom-0 z-[250] border-t border-white/10 bg-[#09090B]/85 backdrop-blur-xl backdrop-saturate-150`}>
      <div className={`flex items-center justify-around px-2 pt-1 ${isFeed ? "pb-[calc(env(safe-area-inset-bottom)+14px)]" : "pb-[calc(env(safe-area-inset-bottom)+8px)]"}`}>
        <Link href="/" className="flex flex-col items-center justify-center gap-0 min-w-0 flex-1 pt-1.5 pb-0">
          <Home size={22} className={isActive("/") ? "text-white" : "text-white/45"} />
          <span className={`text-[10px] font-medium ${isActive("/") ? "text-white" : "text-white/45"}`}>Home</span>
        </Link>

        <Link href="/feed" className="flex flex-col items-center justify-center gap-0 min-w-0 flex-1 pt-1.5 pb-0">
          <Play size={22} className={isActive("/feed") ? "text-white" : "text-white/45"} fill={isActive("/feed") ? "currentColor" : "none"} />
          <span className={`text-[10px] font-medium ${isActive("/feed") ? "text-white" : "text-white/45"}`}>Shorts</span>
        </Link>

        <button
          type="button"
          onClick={() => document.dispatchEvent(new CustomEvent("open-create-menu"))}
          className="flex flex-col items-center justify-center gap-0 min-w-0 flex-1 pt-1.5 pb-0"
          aria-label="Create"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center">
            <Plus size={18} className="text-white" />
          </div>
          <span className="text-[10px] font-medium text-white/70">Create</span>
        </button>

        <Link href="/wallet" className="flex flex-col items-center justify-center gap-0 min-w-0 flex-1 pt-1.5 pb-0">
          <Wallet size={22} className={isActive("/wallet") ? "text-white" : "text-white/45"} />
          <span className={`text-[10px] font-medium ${isActive("/wallet") ? "text-white" : "text-white/45"}`}>Wallet</span>
        </Link>

        <Link href={profileHref} className="flex flex-col items-center justify-center gap-0 min-w-0 flex-1 pt-1.5 pb-0">
          <div className={`w-[22px] h-[22px] rounded-full overflow-hidden border ${profileActive ? "border-white" : "border-white/30"} bg-white/10 flex items-center justify-center`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={13} className={profileActive ? "text-white" : "text-white/55"} />
            )}
          </div>
          <span className={`text-[10px] font-medium ${profileActive ? "text-white" : "text-white/45"}`}>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
