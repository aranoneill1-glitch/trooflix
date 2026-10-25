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
  Users,
  Flag,
  Banknote,
  PlayCircle,
  AlertTriangle,
  Trash2,
  ShoppingBag,
} from "lucide-react";

const ITEMS = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Videos", path: "/admin/videos", icon: Video },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Sales", path: "/admin/sales", icon: ShoppingBag },
  { label: "Reports", path: "/admin/reports", icon: Flag },
  { label: "Podcasters", path: "/admin/podcasters", icon: Mic },
  { label: "Payouts", path: "/admin/payouts", icon: Banknote },
  { label: "Watch Time", path: "/admin/watch-time", icon: PlayCircle },
  { label: "Applications", path: "/admin/applications", icon: Inbox },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState<string>("");

  const isActive = (item: { path: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(item.path + "/");
  };

  const logout = async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const handleWipe = async () => {
    if (wipeConfirm !== "DELETE") {
      setWipeResult('You must type "DELETE" exactly to confirm.');
      return;
    }
    setWiping(true);
    setWipeResult("");
    try {
      const res = await fetch("/api/admin/wipe-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setWipeResult(d.error || "Wipe failed");
      } else {
        setWipeResult(`✅ Wiped ${d.deleted} posts. Kept ${d.kept} (Loose Change).`);
        setWipeConfirm("");
        setTimeout(() => {
          setWipeOpen(false);
          window.location.reload();
        }, 2000);
      }
    } catch {
      setWipeResult("Network error");
    } finally {
      setWiping(false);
    }
  };

  const sidebarContent = (
    <>
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

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
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

      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <button
          onClick={() => {
            setWipeOpen(true);
            setWipeResult("");
            setWipeConfirm("");
            setMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 transition font-medium mb-2"
        >
          <Trash2 size={18} />
          Wipe Feed
        </button>
        
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

      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#0a0a0c] border-r border-white/5 relative">
        {sidebarContent}
      </aside>

      {wipeOpen && (
        <div className="fixed inset-0 z-[500] bg-black/85 flex items-center justify-center px-4">
          <div className="bg-[#0f0f12] border border-red-600/40 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={22} className="text-red-500" />
              <h3 className="text-lg font-bold text-red-400">Wipe Feed?</h3>
            </div>
            <p className="text-sm text-white/70 mb-4">
              This will delete <strong className="text-white">every video</strong>, comment, like, view, repost, and notification. Only <strong className="text-white">Loose Change</strong> will remain.
            </p>
            <p className="text-sm text-white/70 mb-2">
              Type <strong className="text-red-400">DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={wipeConfirm}
              onChange={(e) => setWipeConfirm(e.target.value)}
              placeholder="Type DELETE"
              autoFocus
              className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 mb-4 outline-none focus:border-red-600 text-sm"
            />
            {wipeResult && (
              <p className="text-xs text-red-300 mb-3">{wipeResult}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setWipeOpen(false);
                  setWipeConfirm("");
                  setWipeResult("");
                }}
                disabled={wiping}
                className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                disabled={wiping || wipeConfirm !== "DELETE"}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 font-semibold transition"
              >
                {wiping ? "Wiping…" : "Wipe Feed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
