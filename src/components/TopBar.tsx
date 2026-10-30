"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, RefreshCw } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import CreateSheet from "@/components/CreateSheet";

type Props = {
  onMenu?: () => void;
};

export default function TopBar({ onMenu }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };
  
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 lg:left-[72px] right-0 z-[200] flex items-center gap-6 px-6 md:px-8 py-4 transition-colors duration-300 ${
        scrolled
          ? "bg-black"
          : "bg-gradient-to-b from-black/90 via-black/60 to-transparent"
      }`}
    >
      {/* Hamburger (Mobile Only) */}
      {onMenu && (
        <button
          onClick={onMenu}
          className="lg:hidden text-white/90 hover:text-white transition"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Logo OR Plus Button */}
      {pathname === "/profile" ? (
        <div className="relative shrink-0">
          <button onClick={() => setCreateOpen(!createOpen)} className="p-1 hover:bg-white/10 rounded-full transition">
            <Plus size={24} className="text-white" />
          </button>
          <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
        </div>
      ) : (
        <Link href="/" className="text-xl md:text-2xl font-black tracking-tight shrink-0">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4 md:gap-5">
        
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-white/90 hover:text-white transition disabled:opacity-50"
          aria-label="Refresh App"
        >
          <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
        </button>
        
        <NotificationBell />

        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
