"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, X, Sparkles } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

type Tier = "user" | "pro" | "podcaster";

const FEATURES = [
  { label: "Post 90-second reels", free: true, pro: true, podcaster: true },
  { label: "Unlimited-length reels", free: false, pro: true, podcaster: true },
  { label: "Post images", free: true, pro: true, podcaster: true },
  { label: "Post Troos (text)", free: true, pro: true, podcaster: true },
  { label: "Post podcasts", free: false, pro: false, podcaster: true },
  { label: "Dedicated podcaster page", free: false, pro: false, podcaster: true },
  { label: "Featured in the podcast section", free: false, pro: false, podcaster: true },
  { label: "Featured on the home page", free: false, pro: false, podcaster: true },
  { label: "Red verified badge", free: false, pro: true, podcaster: false },
  { label: "Gold verified badge", free: false, pro: false, podcaster: true },
];

export default function UpgradePage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<Tier>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
        const d = await res.json();
        if (d.profile?.tier && ["user", "pro", "podcaster"].includes(d.profile.tier)) {
          setCurrentTier(d.profile.tier);
        }
      } catch {}
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <TopBar />

      <div className="pt-24 md:pt-28 max-w-5xl mx-auto px-4 md:px-6 pb-16">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-red-500 font-bold mb-2">CHOOSE YOUR TIER</p>
          <h1 className="text-3xl md:text-5xl font-black mb-3">Upgrade your Trooflix</h1>
          <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto">
            Post more, reach further, and get verified. Choose the tier that fits how you create.
          </p>
        </div>

        {/* Three cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* Free */}
          <TierCard
            name="Free"
            tagline="Start posting today"
            features={[
              "Post 90-second reels",
              "Post images & Troos",
              "Comment, like & share",
              "Your own profile page",
            ]}
            isCurrent={currentTier === "user"}
            ctaLabel="You're on Free"
            ctaDisabled={true}
          />

          {/* Pro */}
          <TierCard
            name="Pro"
            tagline="Post without limits"
            badge={<VerifiedBadge size={20} variant="red" />}
            features={[
              "Everything in Free",
              "Unlimited-length reels",
              "Red verified badge",
              "Priority in your feed",
            ]}
            isCurrent={currentTier === "pro"}
            ctaLabel="Coming soon"
            ctaDisabled={true}
          />

          {/* Podcaster */}
          <TierCard
            name="Podcaster"
            tagline="Become a featured creator"
            badge={<VerifiedBadge size={20} variant="gold" />}
            features={[
              "Everything in Pro",
              "Post full-length podcasts",
              "Dedicated podcaster page",
              "Featured in podcast section",
              "Featured on the home page",
              "Gold verified badge",
            ]}
            isCurrent={currentTier === "podcaster"}
            ctaLabel="Coming soon"
            ctaDisabled={true}
            highlight={true}
          />
        </div>

        {/* Feature comparison table */}
        <div className="bg-[#0f0f12] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-lg font-bold">Feature comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 font-semibold text-white/60 w-1/2">Feature</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Free</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Pro</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Podcaster</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 text-white/90">{f.label}</td>
                    <td className="text-center px-3 py-3">
                      {f.free ? <Check size={16} className="inline text-green-500" /> : <X size={16} className="inline text-white/20" />}
                    </td>
                    <td className="text-center px-3 py-3">
                      {f.pro ? <Check size={16} className="inline text-green-500" /> : <X size={16} className="inline text-white/20" />}
                    </td>
                    <td className="text-center px-3 py-3">
                      {f.podcaster ? <Check size={16} className="inline text-green-500" /> : <X size={16} className="inline text-white/20" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-8 max-w-xl mx-auto">
          Paid tiers are launching soon. Stay tuned — you&apos;ll be notified when upgrades are available.
        </p>
      </div>

      <MobileBottomNav />
    </main>
  );
}

function TierCard({
  name,
  tagline,
  badge,
  features,
  isCurrent,
  ctaLabel,
  ctaDisabled,
  highlight,
}: {
  name: string;
  tagline: string;
  badge?: React.ReactNode;
  features: string[];
  isCurrent: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col ${
        highlight
          ? "bg-gradient-to-b from-yellow-950/40 to-[#0f0f12] border-2 border-yellow-600/40"
          : "bg-[#0f0f12] border border-white/10"
      } ${isCurrent ? "ring-2 ring-white/20" : ""}`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-yellow-600 rounded-full text-xs font-bold text-black flex items-center gap-1">
          <Sparkles size={11} /> FEATURED
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-green-600 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
          Your plan
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-xl font-black">{name}</h3>
        {badge}
      </div>
      <p className="text-sm text-white/50 mb-5">{tagline}</p>

      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/80">
            <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={ctaDisabled}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${
          isCurrent
            ? "bg-white/10 text-white/60 cursor-default"
            : "bg-white/5 text-white/40 cursor-not-allowed"
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
