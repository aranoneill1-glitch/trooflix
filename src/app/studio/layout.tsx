"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home, Upload, Video, Settings, LogOut, ChevronLeft, DollarSign, ShoppingBag, Package,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache, getCachedUser } from "@/lib/cache";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
};

const NAV = [
  { label: "Overview", path: "/studio", icon: Home },
  { label: "Episodes", path: "/studio/episodes", icon: Video },
  { label: "Upload", path: "/studio/upload", icon: Upload },
  { label: "Premium", path: "/studio/premium", icon: DollarSign },
  { label: "Shop", path: "/studio/shop", icon: ShoppingBag },
  { label: "Orders", path: "/studio/orders", icon: Package },
  { label: "Settings", path: "/studio/settings", icon: Settings },
];

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "unauth" | "not-approved">("loading");
  const [creator, setCreator] = useState<Creator | null>(null);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser().then((user) => {
      if (!user) {
        router.replace("/login");
        setState("unauth");
        return;
      }
      fetch(`/api/profile?user_id=${user.id}`)
        .then((r) => r.json())
        .then((profileData) => {
          const tier = profileData.profile?.tier;
          if (tier === "podcaster") {
            fetch(`/api/me/creator?user_id=${user.id}`)
              .then((r) => r.json())
              .then((cr) => {
                const creatorInfo = {
                  id: cr.creator?.id || user.id,
                  name: cr.creator?.name || profileData.profile?.display_name || profileData.profile?.username || "Creator",
                  slug: cr.creator?.slug || profileData.profile?.username || "",
                  photoUrl: cr.creator?.photoUrl || profileData.profile?.avatar_url || "",
                };
                setCreator(creatorInfo);
                setState("ok");
              });
            return;
          }
          router.replace("/apply");
          setState("not-approved");
        })
        .catch(() => {
          router.replace("/login");
          setState("unauth");
        });
    });
  }, [router]);

  if (state !== "ok") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">
          {state === "loading" && "Checking access…"}
          {state === "unauth" && "Redirecting to sign in…"}
          {state === "not-approved" && "You're not an approved creator."}
        </p>
      </div>
    );
  }

  const isActive = (path: string) => path === "/studio" ? pathname === "/studio" : pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-[#0a0a0a] px-3 py-5">
        <Link href="/" className="flex items-center gap-2 text-xs text-white/50 hover:text-white px-2 mb-6 transition">
          <ChevronLeft size={14} /> Back to Trooflix
        </Link>
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden">
            {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-bold">{(creator?.name?.[0] || "?").toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{creator?.name}</p>
            <p className="text-[10px] text-green-400">● Creator</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map((n) => {
            const active = isActive(n.path);
            return (
              <Link key={n.path} href={n.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${active ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                <n.icon size={18} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); clearUserCache(); router.push("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition mt-4">
          <LogOut size={18} /> Log out
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
            {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold">{(creator?.name?.[0] || "?").toUpperCase()}</span>}
          </div>
          <p className="text-sm font-semibold truncate">{creator?.name}</p>
        </div>
        <Link href="/" className="text-xs text-white/50 hover:text-white flex-shrink-0">Exit</Link>
      </div>

      <main className="flex-1 min-w-0 pb-32 md:pb-0">{children}</main>

      {/* FLOATING GLASS STUDIO NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <div className="pointer-events-auto flex items-center overflow-x-auto scrollbar-hide w-[95%] max-w-lg mb-4 px-2 py-2 bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          {NAV.map((n) => {
            const active = isActive(n.path);
            return (
              <Link key={n.path} href={n.path} className={`flex flex-col items-center justify-center min-w-[64px] h-12 rounded-full transition-all ${active ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}>
                <n.icon size={20} className={active ? "text-red-500" : ""} />
                <span className={`text-[9px] mt-0.5 font-semibold ${active ? "text-white" : ""}`}>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
