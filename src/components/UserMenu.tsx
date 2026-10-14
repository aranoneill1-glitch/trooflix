"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type UserInfo = {
  id: string;
  email: string;
  initial: string;
  avatarUrl?: string | null;
  username?: string | null;
  displayName?: string | null;
} | null;

export default function UserMenu() {
  const [user, setUser] = useState<UserInfo>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const base: UserInfo = {
          id: data.user.id,
          email: data.user.email || "",
          initial: (data.user.email || "?")[0].toUpperCase(),
        };
        setUser(base);
        setLoading(false);

        // Fetch profile pic / handle in background
        try {
          const r = await fetch(`/api/profile?user_id=${data.user.id}`);
          const d = await r.json();
          if (d.profile) {
            setUser({
              ...base,
              avatarUrl: d.profile.avatar_url || null,
              username: d.profile.username || null,
              displayName: d.profile.display_name || null,
            });
          }
        } catch {}
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
    router.refresh();
    router.push("/");
  };

  if (loading) {
    return <div className="w-7 h-7" />;
  }

  // Signed out → person icon, links to /login
  if (!user) {
    return (
      <Link
        href="/login"
        className="text-white/90 hover:text-white transition"
        title="Sign in"
      >
        <User size={22} />
      </Link>
    );
  }

  const displayName =
    user.displayName || (user.username ? `@${user.username}` : user.email);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden border border-white/20 hover:border-white/50 transition"
        title={displayName}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[11px] font-bold">
            {user.initial}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-60 bg-[#141418] border border-white/10 rounded-lg shadow-xl overflow-hidden z-[60]">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-white/40 mb-0.5">Signed in as</p>
            <p className="text-sm text-white/90 truncate">{user.email}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white/80 hover:text-white transition text-sm"
          >
            My Profile
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white/80 hover:text-white transition text-sm border-t border-white/10"
          >
            My Account
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white/80 hover:text-white transition text-sm border-t border-white/10"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      )}
    </div>
  );
}
