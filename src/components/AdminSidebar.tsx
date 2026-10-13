"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Mic,
  Inbox,
  Settings,
  LogOut,
  Home,
  Menu,
  X,
} from "lucide-react";

const ITEMS = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Videos", path: "/admin/videos", icon: Video },
  { label: "Podcasters", path: "/admin/podcasters", icon: Mic },
  { label: "Applications", path: "/admin/applications", icon: Inbox },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: { path: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(item.path + "/");
  };

  const logout = async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between">
        <Link href="/admin" className="text-2xl font-black tracking-tight block">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-white/60 hover:text-white"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
        <p className="hidden md:block absolute text-[10px] tracking-[0.3em] text-white/40 font-semibold mt-8">
          ADMIN
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-white/5 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={18} className={active ? "text-red-500" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
        >
          <Home size={18} />
          View Site
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0a0a0c]/95 backdrop-blur border-b border-white/5 flex items-center justify-between px-4 py-3">
        <Link href="/admin" className="text-xl font-black tracking-tight">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/80 hover:text-white"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-0 left-0 h-full w-72 bg-[#0a0a0c] border-r border-white/5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#0a0a0c] border-r border-white/5 relative">
        {sidebarContent}
      </aside>
    </>
  );
}
