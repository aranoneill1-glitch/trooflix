"use client";

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

  const isActive = (item: { path: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(item.path + "/");
  };

  const logout = async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#0a0a0c] border-r border-white/5">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <Link href="/admin" className="text-2xl font-black tracking-tight block">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>
        <p className="text-[10px] tracking-[0.3em] text-white/40 font-semibold mt-1">
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
    </aside>
  );
}
