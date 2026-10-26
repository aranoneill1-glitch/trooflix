"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, PlaySquare, DollarSign, Settings, 
  Menu, X, Home, LogOut 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/studio", icon: LayoutDashboard, exact: true },
  { label: "Content", path: "/studio/episodes", icon: PlaySquare },
  { label: "Monetization", path: "/studio/premium", icon: DollarSign },
  { label: "Settings", path: "/studio/settings", icon: Settings },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: any) => {
    if (item.exact) return pathname === item.path;
    return pathname.startsWith(item.path);
  };

  const handleLogout = async () => {
    clearUserCache();
    router.push("/");
  };

  const SidebarContent = (
    <>
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
        <Link href="/" className="flex flex-col">
          <span className="text-xl font-black tracking-tight">
            <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
          </span>
          <span className="text-[10px] tracking-[0.3em] text-yellow-500 font-bold mt-1">STUDIO</span>
        </Link>
        <button onClick={() => setMobileOpen(false)} className="md:hidden p-2 text-white/50 hover:text-white bg-white/5 rounded-full">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active 
                  ? "bg-yellow-500/10 text-yellow-400 font-semibold border border-yellow-500/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <item.icon size={18} className={active ? "text-yellow-500" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition">
          <Home size={18} /> View Site
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition">
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0a0a0c]/95 backdrop-blur border-b border-white/5 flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-black tracking-tight">
          <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
          <span className="text-[10px] tracking-[0.3em] text-yellow-500 font-bold ml-2">STUDIO</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2 text-white/80 hover:text-white bg-white/5 rounded-lg">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="md:hidden fixed top-0 left-0 h-full w-[280px] bg-[#0a0a0c] border-r border-white/5 flex flex-col z-[60]">
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#0a0a0c] border-r border-white/5">
        {SidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-0 pb-10 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
