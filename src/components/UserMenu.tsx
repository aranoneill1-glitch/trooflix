"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

type UserInfo = {
  id: string;
  email: string;
  initial: string;
  avatarUrl?: string | null;
} | null;

export default function UserMenu() {
  const [user, setUser] = useState<UserInfo>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const user = await getCachedUser();
      if (user) {
        const base: UserInfo = {
          id: user.id,
          email: user.email || "",
          initial: (user.email || "?")[0].toUpperCase(),
        };
        
        // Fetch profile to get avatar BEFORE we stop loading
        try {
          const r = await fetch(`/api/profile?user_id=${user.id}`);
          const d = await r.json();
          if (d.profile) {
            setUser({ ...base, avatarUrl: d.profile.avatar_url || null });
          } else {
            setUser(base);
          }
        } catch {
          setUser(base);
        } finally {
          setLoading(false);
        }
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

  // Smooth loading skeleton instead of the "Q" letter
  if (loading) {
    return <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse border border-white/20" />;
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

  // Signed in → avatar → straight to /profile
  return (
    <Link
      href="/creator-dashboard?view=public"
      className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden border border-white/20 hover:border-white/50 transition"
      title="My profile"
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[11px] font-bold">
          {user.initial}
        </div>
      )}
    </Link>
  );
}
