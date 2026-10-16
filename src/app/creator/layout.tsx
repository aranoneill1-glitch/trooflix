"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Upload,
  Video,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";
import { getCachedUser } from "@/lib/cache";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
};

const NAV = [
  { label: "My Videos", path: "/creator", icon: Video },
  { label: "Upload", path: "/creator/upload", icon: Upload },
  { label: "Settings", path: "/creator/settings", icon: Settings },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<
    "loading" | "ok" | "unauth" | "not-approved"
  >("loading");
  const [creator, setCreator] = useState<Creator | null>(null);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser().then((user) => {
      if (!user) {
        router.replace("/login");
        setState("unauth");
        return;
      }
      fetch(`/api/me/creator?user_id=${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.creator) {
            router.replace("/apply");
            setState("not-approved");
            return;
          }
          setCreator(d.creator);
          setState("ok");
        })
        .catch(() => {
          router.replace("/apply");
          setState("not-approved");
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

  const isActive = (path: string) =>
    path === "/creator" ? pathname === "/creator" : pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-60 border-r border-white/10 bg-[#0d0d10] px-3 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white px-2 mb-6 transition"
        >
          <ChevronLeft size={14} /> Back to Trooflix
        </Link>

        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden">
            {creator?.photoUrl ? (
              <img
                src={creator.photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold">
                {(creator?.name?.[0] || "?").toUpperCase()}
              </span>
            )}
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
              <Link
                key={n.path}
                href={n.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-white/10 text-white font-semibold"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <n.icon size={18} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            clearUserCache();
            router.push("/");
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-white/5 transition mt-4"
        >
          <LogOut size={18} /> Log out
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[#0d0d10] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
            {creator?.photoUrl ? (
              <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">
                {(creator?.name?.[0] || "?").toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold truncate">{creator?.name}</p>
        </div>
        <Link
          href="/"
          className="text-xs text-white/50 hover:text-white flex-shrink-0"
        >
          Exit
        </Link>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-24 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-white/10">
        <div className="flex justify-around">
          {NAV.map((n) => {
            const active = isActive(n.path);
            return (
              <Link
                key={n.path}
                href={n.path}
                className="flex flex-col items-center gap-0.5 px-1 py-2 flex-1"
              >
                <n.icon
                  size={22}
                  className={active ? "text-white" : "text-white/50"}
                />
                <span
                  className={`text-[9px] ${
                    active ? "text-white font-semibold" : "text-white/50"
                  }`}
                >
                  {n.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
