"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  Eye,
  Users,
  Heart,
  Plus,
  DollarSign,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  isVerified?: boolean;
};

type Video = {
  id: number;
  title: string;
  posterUrl?: string;
  type?: string;
  createdAt?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
};

export default function StudioOverview() {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumStats, setPremiumStats] = useState({ subscribers: 0, gross: 0, net: 0 });
  const [poolCents, setPoolCents] = useState(0);
  const [totals, setTotals] = useState({
    plays: 0,
    likes: 0,
    comments: 0,
    followers: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const user = await getCachedUser();
        if (!user) return;

        // Get creator record for this user
        const cr = await fetch(`/api/me/creator?user_id=${user.id}`).then((r) => r.json());
        if (!cr.creator) {
          setLoading(false);
          return;
        }
        setCreator(cr.creator);

        // Get their videos
        const vRes = await fetch(`/api/creators/videos?creatorId=${cr.creator.id}`).then((r) =>
          r.json()
        );
        const myVideos: Video[] = Array.isArray(vRes.videos) ? vRes.videos : [];
        setVideos(myVideos);
        
        // Fetch Premium Stats
        try {
          const pRes = await fetch(`/api/creator/premium?user_id=${user.id}`).then(r => r.json());
          if (pRes.stats) {
            setPremiumStats({
              subscribers: pRes.stats.active_subscribers,
              gross: pRes.stats.monthly_gross_cents,
              net: pRes.stats.monthly_net_cents
            });
          }
          
          // Fetch Open Book Pool
          try {
            const poolRes = await fetch("/api/creator/open-book").then(r => r.json());
            if (poolRes.pool_cents !== undefined) {
              setPoolCents(poolRes.pool_cents);
            }
          } catch {}
        } catch {}

        // Totals
        const totalPlays = myVideos.reduce((s, v) => s + (v.viewCount || 0), 0);

        // Likes
        let totalLikes = 0;
        try {
          const likesRes = await fetch("/api/like-counts").then((r) => r.json());
          const counts = likesRes.counts || {};
          totalLikes = myVideos.reduce((s, v) => s + (counts[v.id] || 0), 0);
        } catch {}

        // Comments
        let totalComments = 0;
        try {
          const commentsRes = await fetch("/api/comment-counts").then((r) => r.json());
          const counts = commentsRes.counts || {};
          totalComments = myVideos.reduce((s, v) => s + (counts[v.id] || 0), 0);
        } catch {}

        // Followers
        let totalFollowers = 0;
        try {
          const followRes = await fetch(`/api/follow-count?creator_id=${cr.creator.id}`).then((r) =>
            r.json()
          );
          totalFollowers = followRes.count || 0;
        } catch {}

        setTotals({
          plays: totalPlays,
          likes: totalLikes,
          comments: totalComments,
          followers: totalFollowers,
        });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const initials = creator?.name
    ? creator.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <p className="text-white/40 text-sm font-medium">Loading Studio…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center text-xl font-black flex-shrink-0 overflow-hidden ring-2 ring-white/10">
            {creator?.photoUrl ? (
              <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] text-yellow-500 font-bold mb-1 flex items-center gap-1">
              <Sparkles size={12} /> STUDIO
            </p>
            <h1 className="text-2xl md:text-3xl font-black inline-flex items-center gap-2 truncate">
              {creator?.name || "Your Studio"}
              {creator?.isVerified && <VerifiedBadge size={20} variant="gold" />}
            </h1>
          </div>
        </div>
        <Link
          href="/studio/upload"
          className="hidden md:inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
        >
          <Plus size={18} /> Publish Episode
        </Link>
      </div>

      {/* Mobile CTA */}
      <Link
        href="/studio/upload"
        className="md:hidden flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-3 rounded-xl text-sm transition mb-6 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
      >
        <Plus size={18} /> Publish Episode
      </Link>

      {/* Financial & Subscribers */}
      <div className="mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-4 tracking-tight">Revenue & Subscribers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <StatCard 
            icon={Users} 
            label="Active Subscribers" 
            value={premiumStats.subscribers} 
            colorClass="text-purple-400 bg-purple-500/10"
          />
          <StatCard 
            icon={DollarSign} 
            label="Monthly Gross" 
            value={`$${(premiumStats.gross / 100).toFixed(2)}`} 
            colorClass="text-white/70 bg-white/10"
          />
          <StatCard 
            icon={TrendingUp} 
            label="Your 90% Payout" 
            value={`$${(premiumStats.net / 100).toFixed(2)}`} 
            colorClass="text-emerald-400 bg-emerald-500/10"
          />
        </div>
      </div>

      {/* Open Book Transparency */}
      <div className="mb-8">
        <div className="relative bg-gradient-to-br from-green-900/20 via-[#0f0f12] to-[#0f0f12] border border-green-500/20 rounded-3xl p-6 md:p-8 overflow-hidden shadow-[0_0_40px_-10px_rgba(34,197,94,0.15)]">
          {/* Layered background glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-10 -mb-10 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-green-500/20 text-green-400 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md border border-green-500/20">
                  Open Book
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">The Creator Pool</h2>
              <p className="text-white/50 text-sm md:text-base max-w-xl leading-relaxed">
                We believe in total transparency. This is the exact amount of money being distributed back to creators from this month's Trooflix Pass revenue.
              </p>
            </div>
            <div className="shrink-0 text-left md:text-right bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
              <p className="text-[11px] uppercase tracking-widest text-green-400/80 font-bold mb-1">Total Pool This Month</p>
              <p className="text-4xl md:text-5xl font-black text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                ${(poolCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content & Engagement */}
      <div className="mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-4 tracking-tight">Content & Engagement</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard 
            icon={Video} 
            label="Episodes" 
            value={videos.length} 
            colorClass="text-blue-400 bg-blue-500/10"
          />
          <StatCard 
            icon={Eye} 
            label="Total Plays" 
            value={totals.plays} 
            colorClass="text-orange-400 bg-orange-500/10"
          />
          <StatCard 
            icon={Users} 
            label="Followers" 
            value={totals.followers} 
            colorClass="text-pink-400 bg-pink-500/10"
          />
          <StatCard 
            icon={Heart} 
            label="Likes" 
            value={totals.likes} 
            colorClass="text-red-400 bg-red-500/10"
          />
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass = "text-white/50 bg-white/5",
}: {
  icon: any;
  label: string;
  value: number | string;
  colorClass?: string;
}) {
  return (
    <div className="group relative bg-[#0f0f12]/80 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 md:p-5 transition-all duration-300 hover:bg-[#141418] hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorClass} transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-black tabular-nums tracking-tight text-white mb-1 drop-shadow-sm">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-[10px] md:text-[11px] uppercase tracking-widest font-bold text-white/40">
        {label}
      </p>
    </div>
  );
}
