"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Check, X } from "lucide-react";

// Global cache so all buttons share state
let cachedIds: number[] | null = null;
let inflight: Promise<number[]> | null = null;
const listeners = new Set<(ids: number[]) => void>();

async function fetchIds(): Promise<number[]> {
  if (cachedIds) return cachedIds;
  if (inflight) return inflight;

  inflight = fetch("/api/my-list")
    .then((r) => r.json())
    .then((d) => {
      const ids = Array.isArray(d.ids) ? d.ids : [];
      cachedIds = ids;
      inflight = null;
      listeners.forEach((fn) => fn(ids));
      return ids;
    })
    .catch(() => {
      inflight = null;
      return [];
    });

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
  variant?: "icon" | "pill";
}) {
  const [saved, setSaved] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let mounted = true;

    // Subscribe to global list updates
    const onUpdate = (ids: number[]) => {
      if (mounted) setSaved(ids.includes(videoId));
    };
    listeners.add(onUpdate);

    // Initial fetch
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
      // Remove
      setSaved(false);
      const current = cachedIds || [];
      setIds(current.filter((id) => id !== videoId));

      const res = await fetch(`/api/my-list?videoId=${videoId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status === 401) {
        // Not signed in
        setIds(current);
        setSaved(true);
        setShowSignIn(true);
      }
    } else {
      // Add
      setSaved(true);
      const current = cachedIds || [];
      setIds([...current, videoId]);

      const res = await fetch("/api/my-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          // Not signed in
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
    return (
      <button
        className="bg-white/20 backdrop-blur border border-white/40 rounded-full p-1.5 opacity-50"
        disabled
      >
        <Plus size={size} />
      </button>
    );
  }

  const button = (
    <button
      ref={btnRef}
      onClick={toggle}
      className={
        variant === "pill"
          ? `flex items-center gap-2 border-2 rounded-full px-4 py-2 transition ${
              saved
                ? "border-white bg-white/10 text-white"
                : "border-white/60 hover:border-white text-white"
            }`
          : `rounded-full p-1.5 transition ${
              saved
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 text-white"
            }`
      }
      title={saved ? "Remove from My List" : "Add to My List"}
    >
      {saved ? <Check size={size} /> : <Plus size={size} />}
      {variant === "pill" && <span>{saved ? "In My List" : "My List"}</span>}
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