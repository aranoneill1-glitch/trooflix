"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { Search, Menu, X, MessageCircle, Plus } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import CreateSheet from "@/components/CreateSheet";

const NAV_TABS = [
  { label: "Home", path: "/" },
  { label: "Creators", path: "/creators" },
  { label: "Feed", path: "/feed" },
];

type Props = {
  onMenu?: () => void;
};

export default function TopBar({ onMenu }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { search, setSearch, clearSearch } = useSearch();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) => {
    const basePath = path.split("?")[0];
    if (basePath === "/") return pathname === "/";
    return pathname === basePath || pathname.startsWith(basePath + "/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[200] flex items-center gap-6 px-6 md:px-8 py-4 transition-colors duration-300 ${
        scrolled
          ? "bg-black"
          : "bg-gradient-to-b from-black/90 via-black/60 to-transparent"
      }`}
    >
      {/* Hamburger */}
      {onMenu && (
        <button
          onClick={onMenu}
          className="text-white/90 hover:text-white transition"
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

      {/* Desktop tabs */}
      <div className="hidden lg:flex gap-6 text-sm ml-6">
        {NAV_TABS.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`transition tracking-wide ${
              isActive(tab.path)
                ? "text-white font-semibold"
                : "text-white/70 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4 md:gap-5">
        {searchOpen ? (
          <div className="flex items-center gap-2 bg-black/80 border border-white/30 rounded px-3 py-1.5">
            <Search size={16} className="text-white/70" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search) {
                  router.push(`/?q=${encodeURIComponent(search)}`);
                  setSearchOpen(false);
                }
                if (e.key === "Escape") setSearchOpen(false);
              }}
              onBlur={() => !search && setSearchOpen(false)}
              placeholder="Titles, categories"
              className="bg-transparent outline-none text-sm w-32 md:w-64 text-white"
            />
            {search && (
              <button
                onClick={() => {
                  clearSearch();
                  setSearchOpen(false);
                }}
                className="text-white/60 hover:text-white transition"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex text-white/90 hover:text-white transition"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <Link
              href="/search"
              className="md:hidden text-white/90 hover:text-white transition"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>
          </>
        )}

        <NotificationBell />

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/messages"
            className="text-white/90 hover:text-white transition"
            aria-label="Messages"
          >
            <MessageCircle size={20} />
          </Link>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
