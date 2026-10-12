"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home as HomeIcon, Film, Clapperboard, Mic, Plus } from "lucide-react";

const TABS = [
  { icon: HomeIcon, label: "Home", path: "/" },
  { icon: Film, label: "Movies", path: "/movies" },
  { icon: Clapperboard, label: "Documentaries", path: "/documentaries" },
  { icon: Mic, label: "Podcasts", path: "/podcasts" },
  { icon: Plus, label: "My List", path: "/my-list" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
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
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <tab.icon size={22} className={active ? "text-white" : "text-white/50"} />
              <span
                className={`text-[10px] ${
                  active ? "text-white font-semibold" : "text-white/50"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
