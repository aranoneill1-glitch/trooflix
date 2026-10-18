"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCachedUser } from "@/lib/cache";
import VerifiedBadge from "@/components/VerifiedBadge";

type Notification = {
  id: number;
  actor_id: string;
  type: "like" | "comment" | "follow" | "repost";
  post_id: number | null;
  read: boolean;
  created_at: string;
};

type Actor = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  tier?: "user" | "pro" | "podcaster";
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [actors, setActors] = useState<Record<string, Actor>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCachedUser().then((u) => setUserId(u?.id || null));
  }, []);

  // Fetch notifications when user is known + on mount
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/notifications?user_id=${userId}`, { cache: "no-store" });
        const d = await res.json();
        const list: Notification[] = Array.isArray(d.notifications) ? d.notifications : [];
        setNotifications(list);
        setUnread(d.unread || 0);

        // Fetch actor profiles (once)
        const actorIds = Array.from(new Set(list.map((n) => n.actor_id)));
        const profiles: Record<string, Actor> = {};
        await Promise.all(
          actorIds.map(async (id) => {
            try {
              const r = await fetch(`/api/profile?user_id=${id}`);
              const pd = await r.json();
              if (pd.profile) profiles[id] = { ...pd.profile, user_id: id };
            } catch {}
          })
        );
        setActors(profiles);
      } catch {}
    };
    load();
    // Refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleOpen = async () => {
    setOpen((v) => !v);
    // Mark all as read when opening
    if (!open && unread > 0 && userId) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        setUnread(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {}
    }
  };

  if (!userId) return null;

  const labelFor = (n: Notification) => {
    if (n.type === "like") return "liked your post";
    if (n.type === "comment") return "commented on your post";
    if (n.type === "follow") return "started following you";
    if (n.type === "repost") return "reposted your post";
    return "did something";
  };

  const hrefFor = (n: Notification) => {
    if (n.type === "follow") return `/u/${actors[n.actor_id]?.username || ""}`;
    if (n.post_id) return `/feed?reel=${n.post_id}`;
    return "/feed";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative text-white/90 hover:text-white transition p-1"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 ring-2 ring-black" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-y-auto bg-[#0f0f12] border border-white/10 rounded-xl shadow-2xl z-[200]"
          >
            <div className="sticky top-0 bg-[#0f0f12] border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-bold">Notifications</p>
              <button
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center text-white/50 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const actor = actors[n.actor_id];
                const name = actor?.display_name || actor?.username || "Someone";
                const username = actor?.username;
                return (
                  <Link
                    key={n.id}
                    href={hrefFor(n)}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition ${
                      !n.read ? "bg-white/[0.03]" : ""
                    }`}
                  >
                    {actor?.avatar_url ? (
                      <img
                        src={actor.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {name[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 leading-snug">
                        <span className="font-semibold inline-flex items-center gap-1">
                          {name}
                          {actor?.is_verified && <VerifiedBadge size={12} variant={actor.tier === "podcaster" ? "gold" : "red"} />}
                        </span>{" "}
                        {labelFor(n)}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                    )}
                  </Link>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
