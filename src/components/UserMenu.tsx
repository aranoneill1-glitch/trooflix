"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings, CreditCard, LayoutDashboard } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCachedUser().then((u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      setUser(u);
      fetch(`/api/profile?user_id=${u.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile) setProfile(d.profile);
        })
        .finally(() => setLoading(false));
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />;
  }

  if (!user) {
    return (
      <Link href="/login" className="bg-[#E53945] hover:bg-[#d12e39] text-white text-sm font-bold px-4 py-2 rounded-full transition">
        Sign In
      </Link>
    );
  }

  const isCreator = profile?.tier === 'creator' || profile?.tier === 'podcaster' || profile?.tier === 'pro';
  const profileLink = isCreator ? "/creator-dashboard" : `/profile/${profile?.username || ""}`;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none"
      >
        {profile?.avatar_url ? (
          <img 
            src={profile.avatar_url} 
            alt="Avatar" 
            className="w-9 h-9 rounded-full object-cover border-2 border-transparent hover:border-white/30 transition-all"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E53945] to-red-900 flex items-center justify-center text-white font-bold border-2 border-transparent hover:border-white/30 transition-all">
            {(profile?.display_name || profile?.username || "U")[0].toUpperCase()}
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-56 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[300]"
          >
            <div className="p-4 border-b border-white/5">
              <p className="text-sm font-bold text-white truncate">{profile?.display_name || profile?.username}</p>
              <p className="text-xs text-white/50 truncate">@{profile?.username}</p>
              {isCreator && (
                <span className="inline-block mt-2 text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  Creator
                </span>
              )}
            </div>

            <div className="p-2">
              <Link 
                href={profileLink}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition text-sm text-white/80 hover:text-white"
              >
                {isCreator ? <LayoutDashboard size={16} /> : <User size={16} />}
                {isCreator ? "Creator Dashboard" : "My Profile"}
              </Link>

              {isCreator && (
                <Link 
                  href="/creator-dashboard/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition text-sm text-white/80 hover:text-white"
                >
                  <Settings size={16} />
                  Account Settings
                </Link>
              )}

              <div className="h-px bg-white/5 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition text-sm text-red-500"
              >
                <LogOut size={16} />
                Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
