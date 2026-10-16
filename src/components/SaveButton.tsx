"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

let cachedIds: number[] | null = null;
let cachedUserId: string | null | undefined = undefined;
let inflight: Promise<number[]> | null = null;
const listeners = new Set<(ids: number[]) => void>();

async function getUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  try {
    const supabase = createClient();
    const user = await getCachedUser();
    cachedUserId = user?.id || null;
    return cachedUserId;
  } catch {
    cachedUserId = null;
    return null;
  }
}

async function fetchIds(): Promise<number[]> {
  if (cachedIds) return cachedIds;
  if (inflight) return inflight;

  inflight = (async () => {
    const userId = await getUserId();
    if (!userId) {
      inflight = null;
      return [];
    }
    const r = await fetch(`/api/my-list?user_id=${userId}`);
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
  size = 20,
  variant = "icon",
}: {
  videoId: number;
  size?: number;
  variant?: "icon" | "labeled";
}) {
  const [saved, setSaved] = useState(false);
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

    const userId = await getUserId();
    if (!userId) {
      setShowSignIn(true);
      return;
    }

    const wasSaved = saved;
    setSaved(!wasSaved);
    const current = cachedIds || [];
    setIds(
      wasSaved
        ? current.filter((id) => id !== videoId)
        : [...current, videoId]
    );

    const url = wasSaved
      ? `/api/my-list?user_id=${userId}&videoId=${videoId}`
      : "/api/my-list";
    const method = wasSaved ? "DELETE" : "POST";
    const body = wasSaved
      ? undefined
      : JSON.stringify({ userId, videoId });

    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });

    if (!res.ok && res.status === 401) {
      setIds(current);
      setSaved(wasSaved);
      setShowSignIn(true);
    } else if (!res.ok) {
      setIds(current);
      setSaved(wasSaved);
    }
  };

  if (checking) {
    return variant === "labeled" ? (
      <button className="bg-white/10 text-white/50 px-5 py-2 rounded text-sm">
        Add to My List
      </button>
    ) : (
      <div style={{ width: size, height: size }} />
    );
  }

  const button =
    variant === "labeled" ? (
      <button
        onClick={toggle}
        className={`flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold transition ${
          saved
            ? "bg-white/10 text-white"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
        title={saved ? "Remove from My List" : "Add to My List"}
      >
        {saved ? <Check size={16} /> : <Plus size={16} />}
        {saved ? "In My List" : "Add to My List"}
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
        {saved ? (
          <Check size={size} strokeWidth={3} />
        ) : (
          <Plus size={size} strokeWidth={3} />
        )}
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
            <h3 className="text-xl font-bold mb-4">Sign in to save</h3>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Sign in to save videos to your list. Your list syncs across all
              your devices.
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
