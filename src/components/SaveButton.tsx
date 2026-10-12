"use client";

import { useEffect, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

let cachedIds: number[] | null = null;
let inflight: Promise<number[]> | null = null;
const listeners = new Set<(ids: number[]) => void>();

async function getUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

let cachedUserId: string | null | undefined = undefined;

async function fetchIds(): Promise<number[]> {
  if (cachedIds) return cachedIds;
  if (inflight) return inflight;

  inflight = (async () => {
    if (cachedUserId === undefined) {
      cachedUserId = await getUserId();
    }
    if (!cachedUserId) {
      inflight = null;
      return [];
    }
    const r = await fetch(`/api/my-list?user_id=${cachedUserId}`);
    const d = await r.json();
    const ids = Array.isArray(d.ids) ? d.ids : [];
    cachedIds = ids;
    inflight = null;
    listeners.forEach((fn) => fn(ids));
    return ids;
  })();

  return inflight;
}

function setIds(ids: number[]) {
  cachedIds = ids;
  listeners.forEach((fn) => fn(ids));
}

export default function SaveButton({
  videoId,
  size = 28,
  variant = "icon",
}: {
  videoId: number;
  size?: number;
  variant?: "icon" | "pill";
}) {
  const [saved, setSaved] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    const onUpdate = (ids: number[]) => {
      if (mounted) setSaved(ids.includes(videoId));
    };
    listeners.add(onUpdate);

    fetchIds().then((ids) => {
      if (mounted) {
        setSaved(ids.includes(videoId));
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      listeners.delete(onUpdate);
    };
  }, [videoId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (saved) {
      setSaved(false);
      const current = cachedIds || [];
      setIds(current.filter((id) => id !== videoId));

      const res = await fetch(`/api/my-list?user_id=${cachedUserId}&videoId=${videoId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status === 401) {
        setIds(current);
        setSaved(true);
        setShowSignIn(true);
      }
    } else {
      setSaved(true);
      const current = cachedIds || [];
      setIds([...current, videoId]);

      if (cachedUserId === undefined) {
        cachedUserId = await getUserId();
      }
      const res = await fetch("/api/my-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: cachedUserId, videoId }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setIds(current);
          setSaved(false);
          setShowSignIn(true);
        } else {
          setIds(current);
          setSaved(false);
        }
      }
    }
  };

  if (checking) {
    return <div style={{ width: size, height: size }} />;
  }

  const button =
    variant === "pill" ? (
      <button
        onClick={toggle}
        className={`flex items-center gap-2 border-2 rounded-full px-4 py-2 transition ${
          saved
            ? "border-white bg-white/10 text-white"
            : "border-white/60 hover:border-white text-white"
        }`}
        title={saved ? "Remove from My List" : "Add to My List"}
      >
        {saved ? <Check size={20} /> : <Plus size={20} />}
        <span>{saved ? "In My List" : "My List"}</span>
      </button>
    ) : (
      <button
        onClick={toggle}
        className={`p-1 transition ${
          saved
            ? "text-red-500 hover:text-red-400"
            : "text-white hover:text-white/70"
        }`}
        title={saved ? "Remove from My List" : "Add to My List"}
        style={{ lineHeight: 0 }}
      >
        {saved ? <Check size={size} strokeWidth={3} /> : <Plus size={size} strokeWidth={3} />}
      </button>
    );

  return (
    <>
      {button}
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
              <h3 className="text-xl font-bold">Sign in to save</h3>
              <button
                onClick={() => setShowSignIn(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Create an account or sign in to save videos to your list. Your
              list syncs across all your devices.
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
