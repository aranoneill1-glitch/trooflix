"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Play, Mic, MessageCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { usePrefetch } from "@/lib/usePrefetch";
import { getCachedUser } from "@/lib/cache";

const TABS: {
  icon?: any;
  red?: boolean;
  customImage?: string;
  label: string;
  path: string;
}[] = [
  { customImage: "/icons/home.png", label: "Home", path: "/" },
  { icon: Play, label: "Feed", path: "/feed", red: true },
  { icon: Mic, label: "Podcasts", path: "/podcasts", red: true },
  { icon: MessageCircle, label: "Messages", path: "/messages", red: true },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

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

  const router = useRouter();

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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-white/10">
      <div className="flex justify-around items-center pt-2 pb-5">
        {TABS.map((tab) => {
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              onMouseEnter={() => prefetchTab(tab.path)}
              onTouchStart={() => prefetchTab(tab.path)}
              className="flex flex-col items-center gap-0.5 px-1 py-1 flex-1 min-w-0"
            >
              {tab.customImage ? (
                <img
                  src={tab.customImage}
                  alt=""
                  className={`w-[22px] h-[22px] object-contain transition-opacity ${
                    active ? "opacity-100" : "opacity-50"
                  }`}
                />
              ) : (
                <tab.icon
                  size={22}
                  className={
                    tab.red
                      ? "text-red-500"
                      : active
                      ? "text-white"
                      : "text-white/50"
                  }
                />
              )}
              <span
                className={`text-[9px] leading-tight truncate w-full text-center ${
                  active ? "text-white font-semibold" : "text-white/50"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Profile (avatar) tab */}
        <Link
          href={signedIn === false ? "/login" : "/profile"}
          onMouseEnter={() => prefetchTab(signedIn === false ? "/login" : "/profile")}
          onTouchStart={() => prefetchTab(signedIn === false ? "/login" : "/profile")}
          className="flex flex-col items-center gap-0.5 px-1 py-1 flex-1 min-w-0 -translate-y-0.5"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
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
        </Link>
      </div>
    </nav>
  );
}
