"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Play } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import VerifiedBadge from "@/components/VerifiedBadge";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  heroBackdropUrl?: string;
  description?: string;
};

type Video = {
  id: string;
  title: string;
  posterUrl?: string;
  is_premium?: boolean;
};

export default function PodcasterPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [premiumData, setPremiumData] = useState<any>(null);
  const [hasSub, setHasSub] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await getCachedUser();
      
      // Fetch creator + premium data
      const res = await fetch(`/api/creators/${slug}`); // Assuming you have this, or we use KV
      // If you don't have this API, we fallback to fetching all creators
      const allCreators = await fetch("/api/creators").then(r => r.json());
      const c = allCreators.find((x: any) => x.slug === slug);
      
      if (c) {
        setCreator(c);
        
        // Fetch premium settings for this creator
        const pRes = await fetch(`/api/profile?user_id=${c.ownerUserId}`);
        const pData = await pRes.json();
        
        if (pData.profile?.premium_enabled) {
          setPremiumData({
            enabled: true,
            price_cents: pData.profile.premium_price_cents,
            ownerUserId: c.ownerUserId
          });

          // Check if current user is subscribed
          if (user) {
            const subRes = await fetch(`/api/creator/check-sub?userId=${user.id}&creatorId=${c.id}`);
            const subData = await subRes.json();
            setHasSub(subData.hasSub);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleSubscribe = async () => {
    const user = await getCachedUser();
    if (!user) return router.push("/login");

    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, creatorId: premiumData.ownerUserId }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "Could not start checkout");
    } catch {
      alert("Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;
  if (!creator) return <div className="p-8 text-white/50 text-center">Creator not found</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Hero */}
      <div className="relative h-64 md:h-80 w-full bg-[#141418]">
        {creator.heroBackdropUrl && (
          <img src={creator.heroBackdropUrl} alt="" className="w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 max-w-6xl mx-auto flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#0a0a0c] bg-red-900 overflow-hidden flex-shrink-0">
              {creator.photoUrl ? (
                <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold">{creator.name[0]}</div>
              )}
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black">{creator.name}</h1>
                <VerifiedBadge size={24} variant="gold" />
              </div>
              <p className="text-white/60 line-clamp-2 max-w-lg mt-1">{creator.description}</p>
            </div>
          </div>
          
          {premiumData?.enabled && !hasSub && (
            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-full flex items-center gap-2 transition disabled:opacity-50"
            >
              Subscribe for ${(premiumData.price_cents / 100).toFixed(2)}/mo
            </button>
          )}
          {hasSub && (
            <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-full text-sm font-semibold">
              ✓ Subscribed to Premium
            </div>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6">Episodes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {videos.map((v) => {
            const isLocked = v.is_premium && !hasSub;
            return (
              <div key={v.id} className="relative group">
                <Link href={isLocked ? "#" : `/podcast/${v.id}`} className={isLocked ? "cursor-not-allowed" : ""}>
                  <div className="aspect-video bg-[#141418] rounded-xl overflow-hidden relative">
                    {v.posterUrl && (
                      <img src={v.posterUrl} alt="" className={`w-full h-full object-cover ${isLocked ? 'blur-sm opacity-50' : ''}`} />
                    )}
                    {!isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                        <Play size={40} className="text-white fill-white" />
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                        <Lock size={32} className="text-yellow-500 mb-2" />
                        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Premium</span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 font-semibold line-clamp-2">{v.title}</h3>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
