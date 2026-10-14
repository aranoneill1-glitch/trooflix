"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home as HomeIcon, Play, Mic, MessageCircle, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const TABS = [
  { icon: HomeIcon, label: "Home", path: "/" },
  { icon: Play, label: "Feed", path: "/feed" },
  { icon: Mic, label: "Podcasts", path: "/podcasts" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      fetch(`/api/profile?user_id=${data.user.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url);
        })
        .catch(() => {});
    });
  }, [pathname]); // refresh on route change so avatar stays current

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  const profileActive = pathname === "/profile" || pathname.startsWith("/profile");

  const onAvatarTab = (e: React.MouseEvent) => {
    if (signedIn === false) {
      e.preventDefault();
      router.push("/login");
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-white/10">
      <div className="flex justify-around items-center py-2">
        {TABS.map((tab) => {
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className="flex flex-col items-center gap-0.5 px-1 py-1 flex-1 min-w-0"
            >
              <tab.icon size={22} className={active ? "text-white" : "text-white/50"} />
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

        {/* Avatar tab (replaces My List) */}
        <Link
          href={signedIn === false ? "/login" : "/profile"}
          onClick={onAvatarTab}
          className="flex flex-col items-center gap-0.5 px-1 py-1 flex-1 min-w-0"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className={`w-[22px] h-[22px] rounded-full object-cover ${
                profileActive ? "ring-2 ring-white" : "ring-1 ring-white/30"
              }`}
            />
          ) : signedIn === false ? (
            <User size={22} className={profileActive ? "text-white" : "text-white/50"} />
          ) : (
            // Signed in but no avatar yet — show initial letter
            <div
              className={`w-[22px] h-[22px] rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[10px] font-bold ${
                profileActive ? "ring-2 ring-white" : ""
              }`}
            >
              •
            </div>
          )}
          <span
            className={`text-[9px] leading-tight truncate w-full text-center ${
              profileActive ? "text-white font-semibold" : "text-white/50"
            }`}
          >
            Profile
          </span>
        </Link>
      </div>
    </nav>
  );
}
