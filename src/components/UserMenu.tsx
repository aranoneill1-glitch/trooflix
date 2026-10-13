"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type UserInfo = {
  email: string;
  initial: string;
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
        setUser({
          email: data.user.email || "",
          initial: (data.user.email || "?")[0].toUpperCase(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
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
  };

  if (loading) {
    return <div className="w-8 h-8" />;
  }

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-white/90 hover:text-white transition"
        title={user.email}
      >
        <User size={22} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-[#141418] border border-white/10 rounded-lg shadow-xl overflow-hidden z-[60]">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-white/40 mb-0.5">Signed in as</p>
            <p className="text-sm text-white/90 truncate">{user.email}</p>
          </div>
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
