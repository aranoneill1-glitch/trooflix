"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Users, Eye, Heart, Repeat2, Coins, ShoppingBag, BadgeDollarSign } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser, getCachedVideos } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

type VideoStat = {
  id: number;
  title: string;
  views: number;
  likes: number;
  reposts: number;
  tips: number;
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [subscribers, setSubscribers] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [coinsTipped, setCoinsTipped] = useState(0);
  const [tipsReceived, setTipsReceived] = useState(0);
  const [videos, setVideos] = useState<VideoStat[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCachedUser();
        if (!user) { window.location.href = "/login"; return; }
        const supabase = createClient();

        const [videosData, profileRes] = await Promise.all([
          getCachedVideos().catch(() => []),
          fetch(`/api/profile?user_id=${user.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
        ]);

        const profile = profileRes?.profile || null;
        const allVideos = Array.isArray(videosData) ? videosData : [];
        const myVideos = allVideos.filter((v: any) => String(v.uploaderUserId || "") === String(user.id));
        const videoIds = myVideos.map((v: any) => v.id).filter(Boolean);

        // Followers
        try {
          const { count } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id);
          setFollowers(count || 0);
        } catch {}
        // Subscribers (best-effort: subscriptions table by creator/profile id)
        try {
          const creatorId = profile?.creator_id || profile?.id;
          if (creatorId) {
            const { count } = await supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("creator_id", creatorId).eq("status", "active");
            setSubscribers(count || 0);
          }
        } catch {}

        // Items sold (best-effort)
        try {
          const { data: orders } = await supabase.from("orders").select("id,quantity,creator_id,status").eq("creator_id", profile?.creator_id || -1);
          const sold = (orders || []).reduce((sum: number, o: any) => sum + (Number(o.quantity) || 1), 0);
          setItemsSold(sold);
        } catch {}

        // Tips received / coins tipped (best-effort)
        try {
          const { data: received } = await supabase.from("tips").select("amount").eq("to_user_id", user.id);
          const rec = (received || []).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
          setTipsReceived(rec);
        } catch {}
        try {
          const { data: sent } = await supabase.from("tips").select("amount").eq("from_user_id", user.id);
          const sentSum = (sent || []).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
          setCoinsTipped(sentSum);
        } catch {}

        let likeCounts: Record<string, number> = {};
        let repostCounts: Record<string, number> = {};
        let tipCounts: Record<string, number> = {};
        if (videoIds.length > 0) {
          try {
            const lc = await fetch("/api/like-counts", { cache: "no-store" }).then(r => r.json());
            likeCounts = lc?.counts || {};
          } catch {}
          try {
            const rc = await fetch(`/api/reposts?post_ids=${videoIds.join(",")}`, { cache: "no-store" }).then(r => r.json());
            repostCounts = rc?.counts || {};
          } catch {}
          try {
            const tc = await fetch(`/api/tips/counts?videoIds=${videoIds.join(",")}`, { cache: "no-store" }).then(r => r.json());
            tipCounts = tc?.videos || {};
          } catch {}
        }

        const stats: VideoStat[] = myVideos.map((v: any) => ({
          id: Number(v.id),
          title: v.title || "Untitled",
          views: Number(v.views || 0),
          likes: Number(likeCounts[String(v.id)] ?? likeCounts[v.id] ?? 0),
          reposts: Number(repostCounts[String(v.id)] ?? 0),
          tips: Number(tipCounts[String(v.id)] ?? 0),
        })).sort((a, b) => b.views - a.views);
        setVideos(stats);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = useMemo(() => ({
    views: videos.reduce((s, v) => s + v.views, 0),
    likes: videos.reduce((s, v) => s + v.likes, 0),
    reposts: videos.reduce((s, v) => s + v.reposts, 0),
    tips: videos.reduce((s, v) => s + v.tips, 0),
  }), [videos]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-5xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)]">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={22} className="text-[#E53945]" /> Analytics</h1>
            <p className="text-sm text-white/50">Your performance at a glance.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Followers", value: followers, icon: Users },
            { label: "Subscribers", value: subscribers, icon: Users },
            { label: "Views", value: totals.views, icon: Eye },
            { label: "Likes", value: totals.likes, icon: Heart },
            { label: "Reposts", value: totals.reposts, icon: Repeat2 },
            { label: "Content Tips", value: totals.tips, icon: BadgeDollarSign },
            { label: "Items Sold", value: itemsSold, icon: ShoppingBag },
            { label: "Coins Tipped", value: coinsTipped, icon: Coins },
            { label: "Tips Received", value: tipsReceived, icon: Coins },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-white/55 mb-2"><Icon size={15} /><span className="text-[11px] font-bold uppercase tracking-wider">{s.label}</span></div>
                <div className="text-2xl font-black text-white">{Number(s.value || 0).toLocaleString()}</div>
              </div>
            );
          })}
        </div>

        <section className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-4 border-b border-white/10">
            <h2 className="text-lg font-bold">Content Performance</h2>
            <p className="text-xs text-white/45">Views, likes, reposts, and tips per video.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/45 text-[11px] uppercase tracking-wider border-b border-white/10">
                  <th className="text-left px-4 py-3 font-bold">Content</th>
                  <th className="text-right px-4 py-3 font-bold">Views</th>
                  <th className="text-right px-4 py-3 font-bold">Likes</th>
                  <th className="text-right px-4 py-3 font-bold">Reposts</th>
                  <th className="text-right px-4 py-3 font-bold">Tips</th>
                </tr>
              </thead>
              <tbody>
                {videos.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-white/45">No content yet.</td></tr>
                ) : videos.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-white/90 max-w-[240px] truncate">{v.title}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/75">{v.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/75">{v.likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/75">{v.reposts.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/75">{v.tips.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
