"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video, Eye, Users, Heart, Plus, DollarSign, TrendingUp, Wallet, Upload, ShoppingBag, Trash2 } from "lucide-react";
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
  const [totals, setTotals] = useState({ plays: 0, likes: 0, comments: 0, followers: 0 });

  const loadData = async () => {
    try {
      const user = await getCachedUser();
      if (!user) return;

      const cr = await fetch(`/api/me/creator?user_id=${user.id}`).then((r) => r.json());
      if (!cr.creator) { setLoading(false); return; }
      setCreator(cr.creator);

      const vRes = await fetch(`/api/creators/videos?creatorId=${cr.creator.id}`, { cache: "no-store" }).then((r) => r.json());
      const myVideos: Video[] = Array.isArray(vRes.videos) ? vRes.videos : [];
      setVideos(myVideos);
      
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

      const totalPlays = myVideos.reduce((s, v) => s + (v.viewCount || 0), 0);
      let totalLikes = 0;
      try {
        const likesRes = await fetch("/api/like-counts").then((r) => r.json());
        const counts = likesRes.counts || {};
        totalLikes = myVideos.reduce((s, v) => s + (counts[v.id] || 0), 0);
      } catch {}
      let totalFollowers = 0;
      try {
        const followRes = await fetch(`/api/follow-count?creator_id=${cr.creator.id}`).then((r) => r.json());
        totalFollowers = followRes.count || 0;
      } catch {}

      setTotals({ plays: totalPlays, likes: totalLikes, comments: 0, followers: totalFollowers });
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (videoId: number) => {
    if (!confirm("Are you sure you want to delete this video? This cannot be undone.")) return;
    try {
      const user = await getCachedUser();
      if (!user) return;
      const res = await fetch(`/api/user/posts?id=${videoId}&userId=${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
      } else {
        alert("Failed to delete video");
      }
    } catch {
      alert("Network error");
    }
  };

  const initials = creator?.name ? creator.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const setupFeeThreshold = 1500;
  const amountRecouped = Math.min(premiumStats.gross, setupFeeThreshold);
  const progressPercent = (amountRecouped / setupFeeThreshold) * 100;
  const isSetupFeePaid = premiumStats.gross >= setupFeeThreshold;

  if (loading) return <div className="p-8 text-white/50 text-center">Loading Studio…</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center text-xl font-black flex-shrink-0 overflow-hidden ring-2 ring-white/10">
            {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black inline-flex items-center gap-2">
              {creator?.name || "Your Studio"}
              {creator?.isVerified && <VerifiedBadge size={20} variant="gold" />}
            </h1>
            <p className="text-sm text-white/50">Welcome back to your dashboard.</p>
          </div>
        </div>
        <Link href="/studio/upload" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.3)] self-start md:self-auto">
          <Plus size={18} /> Upload Content
        </Link>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Eye size={16} /><span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Total Views</span>
          </div>
          <p className="text-3xl font-black">{totals.plays.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Users size={16} /><span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Active Subscribers</span>
          </div>
          <p className="text-3xl font-black">{premiumStats.subscribers.toLocaleString()}</p>
        </div>
        <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <DollarSign size={16} /><span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Gross Revenue</span>
          </div>
          <p className="text-3xl font-black text-emerald-400">${(premiumStats.gross / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Wallet & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Wallet / Setup Fee Widget */}
          <div className="bg-gradient-to-br from-[#1a1a1f] to-[#0a0a0c] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="text-emerald-400" size={20} />
                  <h2 className="text-lg font-bold">Creator Wallet</h2>
                </div>
                <span className="text-xs font-mono text-white/40">Next Payout: 1st of Month</span>
              </div>
              
              <p className="text-4xl font-black text-white mb-2">${(premiumStats.net / 100).toFixed(2)}</p>
              <p className="text-sm text-white/50 mb-6">Available Balance</p>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white/70">
                    {isSetupFeePaid ? "✅ Platform Fee Paid" : "Platform Setup Fee (First $15)"}
                  </p>
                  <p className="text-xs font-mono text-emerald-400">
                    ${(amountRecouped / 100).toFixed(2)} / $15.00
                  </p>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-2">
                  {isSetupFeePaid 
                    ? "You are now earning 90% of all subscription revenue." 
                    : "Your first $15 in subscription revenue covers your hosting. You keep 100% after that."}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Content with Quick Delete */}
          <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Recent Content</h2>
            {videos.length === 0 ? (
              <p className="text-sm text-white/50 text-center py-8">No videos uploaded yet. <Link href="/studio/upload" className="text-red-400 hover:underline">Upload your first video</Link></p>
            ) : (
              <div className="space-y-3">
                {videos.slice(0, 4).map(v => (
                  <div key={v.id} className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white/5 group">
                    <div className="w-16 h-10 rounded overflow-hidden bg-black flex-shrink-0">
                      {v.posterUrl ? <img src={v.posterUrl} alt="" className="w-full h-full object-cover" /> : <Video size={16} className="m-auto text-white/30 mt-2" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{v.title}</p>
                      <p className="text-xs text-white/40">{(v.viewCount || 0).toLocaleString()} views</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(v.id)} 
                      className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                      title="Delete Video"
                    >
                      <Trash2 size={16} />
                    </button>
                    <Link href="/studio/episodes" className="text-xs font-bold text-white/50 hover:text-white px-2">Manage</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Stats */}
        <div className="space-y-6">
          <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/studio/upload" className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <div className="flex items-center gap-3"><Upload size={16} className="text-red-500" /><span className="text-sm font-semibold">Upload Video/Podcast</span></div>
                <Plus size={14} className="text-white/40" />
              </Link>
              <Link href="/studio/shop" className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <div className="flex items-center gap-3"><ShoppingBag size={16} className="text-emerald-500" /><span className="text-sm font-semibold">Add Merch Product</span></div>
                <Plus size={14} className="text-white/40" />
              </Link>
            </div>
          </div>

          <div className="bg-[#0f0f12] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Engagement</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70"><Heart size={16} className="text-red-400" /> Total Likes</div>
                <span className="font-black">{totals.likes.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70"><Users size={16} className="text-pink-400" /> Followers</div>
                <span className="font-black">{totals.followers.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}
