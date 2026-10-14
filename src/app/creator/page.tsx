"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit3, Trash2, Play } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  posterUrl: string;
  backdropUrl: string;
  bitchuteUrl: string;
  creatorId?: number | null;
  createdAt?: string;
};

export default function CreatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [creatorName, setCreatorName] = useState("");

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const cr = await fetch(`/api/me/creator?user_id=${data.user.id}`).then((r) =>
      r.json()
    );
    if (!cr.creator) {
      setLoading(false);
      return;
    }
    setCreatorName(cr.creator.name);

    const all = await fetch("/api/videos").then((r) => r.json());
    const mine = (Array.isArray(all) ? all : []).filter(
      (v: Video) => v.creatorId === cr.creator.id
    );
    setVideos(mine);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: number) => {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    const res = await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } else {
      alert("Could not delete.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">My Videos</h1>
          <p className="text-white/50 text-sm">
            {videos.length} {videos.length === 1 ? "video" : "videos"} uploaded
          </p>
        </div>
        <Link
          href="/creator/upload"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus size={16} /> Upload
        </Link>
      </div>

      {loading && (
        <p className="text-white/50 py-12 text-center">Loading…</p>
      )}

      {!loading && videos.length === 0 && (
        <div className="bg-[#141418] border border-white/5 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Play size={28} className="text-white/40" />
          </div>
          <h2 className="text-lg font-bold mb-2">No videos yet</h2>
          <p className="text-white/50 text-sm mb-6">
            Upload your first video to get started.
          </p>
          <Link
            href="/creator/upload"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 px-5 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            <Plus size={16} /> Upload a video
          </Link>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div
              key={v.id}
              className="bg-[#141418] border border-white/5 rounded-xl overflow-hidden group"
            >
              <div className="relative aspect-video bg-black">
                <img
                  src={v.backdropUrl || v.posterUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/70 text-[10px] px-2 py-0.5 rounded font-semibold uppercase">
                  {v.type}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                  {v.title}
                </h3>
                <p className="text-xs text-white/50 mb-3">{v.category}</p>
                <div className="flex gap-2">
                  <Link
                    href={`/podcaster/${creatorName.toLowerCase().replace(/\s+/g, "-")}/${v.id}`}
                    className="flex-1 text-center bg-white/10 hover:bg-white/20 text-xs font-semibold py-1.5 rounded transition"
                  >
                    View
                  </Link>
                  <Link
                    href={`/creator/edit/${v.id}`}
                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-xs font-semibold px-3 py-1.5 rounded transition"
                  >
                    <Edit3 size={12} /> Edit
                  </Link>
                  <button
                    onClick={() => remove(v.id)}
                    className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
