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
      <div className="p-6 md:p-10">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center text-xl font-black flex-shrink-0 overflow-hidden">
            {creator?.photoUrl ? (
              <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs tracking-[0.25em] text-yellow-500 font-bold mb-1">
              STUDIO
            </p>
            <h1 className="text-xl md:text-3xl font-black inline-flex items-center gap-2 truncate">
              {creator?.name || "Your Studio"}
              {creator?.isVerified && <VerifiedBadge size={20} variant="gold" />}
            </h1>
          </div>
        </div>
        <Link
          href="/studio/upload"
          className="hidden md:inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 md:px-5 py-2.5 rounded-lg text-sm transition"
        >
          <Plus size={16} /> Publish Episode
        </Link>
      </div>

      {/* Mobile CTA */}
      <Link
        href="/studio/upload"
        className="md:hidden flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-3 rounded-lg text-sm transition mb-6"
      >
        <Plus size={16} /> Publish Episode
      </Link>


      {/* Financial & Subscribers */}
      <div className="mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-4">Revenue & Subscribers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <StatCard icon={Users} label="Active Subscribers" value={premiumStats.subscribers} />
          <StatCard icon={DollarSign} label="Monthly Gross" value={`$${(premiumStats.gross / 100).toFixed(2)}`} />
          <StatCard icon={TrendingUp} label="Your 90% Payout" value={`$${(premiumStats.net / 100).toFixed(2)}`} />
        </div>
      </div>

      {/* Content & Engagement */}
      <div className="mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-4">Content & Engagement</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={Video} label="Episodes" value={videos.length} />
          <StatCard icon={Eye} label="Total Plays" value={totals.plays} />
          <StatCard icon={Users} label="Followers" value={totals.followers} />
          <StatCard icon={Heart} label="Likes" value={totals.likes} />
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
}: {
  icon: any;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-[#0f0f12] border border-white/5 rounded-xl p-3 md:p-4">
      <div className="flex items-center gap-2 text-white/50 mb-2">
        <Icon size={14} />
        <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-black tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
