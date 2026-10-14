"use client";

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Global cache: "me|target" → boolean
const cache = new Map<string, boolean>();
let myId: string | null | undefined = undefined;

async function getMyId(): Promise<string | null> {
  if (myId !== undefined) return myId;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    myId = user?.id || null;
    return myId;
  } catch {
    myId = null;
    return null;
  }
}

type Props = {
  userId: string; // the user being followed
  size?: number;
};

export default function UserFollowButton({ userId, size = 16 }: Props) {
  const [me, setMe] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    getMyId().then((id) => {
      if (!mounted) return;
      setMe(id);
      if (!id) {
        setChecking(false);
        return;
      }
      if (id === userId) {
        setChecking(false);
        return;
      }
      const key = `${id}|${userId}`;
      if (cache.has(key)) {
        setFollowing(cache.get(key)!);
        setChecking(false);
        return;
      }
      fetch(`/api/user-follows?user_id=${id}&target_id=${userId}`)
        .then((r) => r.json())
        .then((d) => {
          if (!mounted) return;
          cache.set(key, !!d.following);
          setFollowing(!!d.following);
          setChecking(false);
        })
        .catch(() => setChecking(false));
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Don't render if this is your own profile
  if (me === userId) return null;

  const toggle = async () => {
    const id = await getMyId();
    if (!id) {
      setShowSignIn(true);
      return;
    }
    setBusy(true);
    const was = following;
    setFollowing(!was);
    cache.set(`${id}|${userId}`, !was);

    const res = await fetch("/api/user-follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followerId: id, followingId: userId }),
    });
    if (!res.ok) {
      setFollowing(was);
      cache.set(`${id}|${userId}`, was);
    }
    setBusy(false);
  };

  if (checking) {
    return (
      <button
        disabled
        className="flex items-center gap-2 bg-white/10 text-white/50 px-4 py-1.5 rounded-full text-sm"
      >
        <Plus size={size} /> Follow
      </button>
    );
  }

  return (
    <>
      <button
        onClick={toggle}
        disabled={busy}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition disabled:opacity-70 ${
          following
            ? "bg-white/10 hover:bg-white/20 text-white"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        {following ? (
          <>
            <Check size={size} /> Following
          </>
        ) : (
          <>
            <Plus size={size} /> Follow
          </>
        )}
      </button>

      {showSignIn && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowSignIn(false)}
        >
          <div
            className="bg-[#141418] border border-white/10 rounded-lg p-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">Sign in to follow</h3>
              <button
                onClick={() => setShowSignIn(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Sign in to follow this user. Your follows sync across all devices.
            </p>
            <div className="flex gap-3">
              <a
                href="/login"
                className="flex-1 text-center bg-red-600 hover:bg-red-500 font-semibold py-2.5 rounded transition"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="flex-1 text-center bg-white/10 hover:bg-white/20 font-semibold py-2.5 rounded transition"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
