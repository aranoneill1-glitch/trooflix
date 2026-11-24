"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Props = {
  videoId?: number;
  creatorId?: number;
  size?: number;
  className?: string;
  showLabel?: boolean;
};

export default function FavoriteButton({ videoId, creatorId, size = 20, className = "", showLabel = false }: Props) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const isCreator = creatorId != null;
  const id = isCreator ? creatorId : videoId;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await getCachedUser();
        if (!user || id == null) { if (mounted) setLoading(false); return; }
        const url = isCreator ? `/api/favorites/creators?user_id=${user.id}` : `/api/my-list?user_id=${user.id}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        const ids = Array.isArray(data.ids) ? data.ids.map(Number) : [];
        if (mounted) setActive(ids.includes(Number(id)));
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id, isCreator]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const user = await getCachedUser();
    if (!user || id == null) { window.location.href = "/login"; return; }
    const next = !active;
    setActive(next);
    try {
      if (isCreator) {
        if (next) {
          await fetch("/api/favorites/creators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, creatorId: Number(id) }) });
        } else {
          await fetch(`/api/favorites/creators?user_id=${user.id}&creatorId=${id}`, { method: "DELETE" });
        }
      } else {
        if (next) {
          await fetch("/api/my-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, videoId: Number(id) }) });
        } else {
          await fetch(`/api/my-list?user_id=${user.id}&videoId=${id}`, { method: "DELETE" });
        }
      }
    } catch {
      setActive(!next);
    }
  };

  if (loading || id == null) return <div style={{ width: size, height: size }} className={className} />;

  return (
    <button onClick={toggle} className={`inline-flex items-center gap-1.5 transition ${active ? "text-red-500" : "text-white/80 hover:text-white"} ${className}`} aria-label={active ? "Remove from favorites" : "Add to favorites"} title={active ? "Remove from favorites" : "Add to favorites"}>
      <Heart size={size} fill={active ? "currentColor" : "none"} strokeWidth={2} />
      {showLabel && <span className="text-sm font-semibold">{active ? "Favorited" : "Favorite"}</span>}
    </button>
  );
}
