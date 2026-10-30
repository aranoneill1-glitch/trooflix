"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Home, Star, Mic, Play, ShoppingBag, Plus, List, User } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function DesktopSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCachedUser().then((u) => {
      if (u) {
        fetch(`/api/profile?user_id=${u.id}`)
          .then((r) => r.json())
          .then((d) => setUser(d.profile))
          .catch(() => {});
      }
    });
  }, []);

  const isCreator = user?.tier === 'creator' || user?.tier === 'podcaster' || user?.tier === 'pro';

  const navItems = [
    { name: "Search", icon: Search, href: "/search" },
    { name: "Home", icon: Home, href: "/" },
    { name: "Trooflix Plus", icon: Star, href: "/plus" },
    { name: "Podcasters", icon: Mic, href: "/podcasts" }, // Replaced Categories with Podcasters
    { name: "Shorts / Feed", icon: Play, href: "/feed" },
    { name: "Marketplace", icon: ShoppingBag, href: "/merchandise" },
  ];

  return (
    <aside className="hidden lg:flex flex-col items-center fixed left-0 top-0 h-screen w-[72px] bg-gradient-to-b from-black/80 via-black/40 to-black/80 backdrop-blur-md border-r border-white/5 z-[100] py-8">
      
      <div className="flex flex-col gap-6 flex-1 w-full items-center pt-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-xl hover:bg-white/10 transition-all ${isActive ? "text-[#E53945]" : "text-white/60 hover:text-white"}`}
            >
              <item.icon size={24} />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E53945] rounded-r-md" />
              )}
              <span className="absolute left-16 px-3 py-1.5 bg-[#1c1c1e] border border-white/10 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          );
        })}

        <div className="w-8 h-px bg-white/10 my-2" />

        {/* Dynamic + Button */}
        {isCreator ? (
          <Link
            href="/creator-dashboard/upload"
            className="group relative flex items-center justify-center w-12 h-12 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-white"
          >
            <Plus size={24} />
            <span className="absolute left-16 px-3 py-1.5 bg-[#1c1c1e] border border-white/10 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Add Content
            </span>
          </Link>
        ) : (
          <Link
            href="/my-list"
            className="group relative flex items-center justify-center w-12 h-12 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-white"
          >
            <List size={24} />
            <span className="absolute left-16 px-3 py-1.5 bg-[#1c1c1e] border border-white/10 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              My List
            </span>
          </Link>
        )}
      </div>

      {/* Avatar at bottom */}
      <div className="mt-auto w-full flex justify-center pb-4">
        <Link
          href={user ? "/creator-dashboard?view=public" : "/login"}
          className="group relative w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-white/50 transition-all"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1c1c1e] flex items-center justify-center text-white/50">
              <User size={20} />
            </div>
          )}
          <span className="absolute left-16 px-3 py-1.5 bg-[#1c1c1e] border border-white/10 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {user ? "My Profile" : "Log In"}
          </span>
        </Link>
      </div>

    </aside>
  );
}
