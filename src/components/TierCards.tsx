"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

type Tier = "user" | "pro" | "podcaster";

const TIERS: Record<Tier, {
  name: string;
  tagline: string;
  badge?: React.ReactNode;
  features: string[];
  comingSoon?: boolean;
}> = {
  user: {
    name: "Free",
    tagline: "Start posting today",
    features: [
      "Post 90-second reels",
      "Post images & Troos",
      "Comment, like & share",
      "Your own profile page",
    ],
  },
  pro: {
    name: "Pro",
    tagline: "Post without limits",
    badge: <VerifiedBadge size={20} variant="red" />,
    features: [
      "Everything in Free",
      "Unlimited-length reels",
      "Red verified badge",
      "Priority in your feed",
    ],
    comingSoon: true,
  },
  podcaster: {
    name: "Podcaster",
    tagline: "Become a featured creator",
    badge: <VerifiedBadge size={20} variant="gold" />,
    features: [
      "Everything in Pro",
      "Post full-length podcasts",
      "Dedicated podcaster page",
      "Featured in podcast section",
      "Featured on the home page",
      "Gold verified badge",
    ],
    comingSoon: true,
  },
};

export default function TierCards({ defaultTier = "user" }: { defaultTier?: Tier }) {
  const [active, setActive] = useState<Tier>(defaultTier);
  const tier = TIERS[active];

  return (
    <div className="w-full">
      {/* Tab row */}
      <div className="flex border-b border-white/10 mb-6">
        {(["user", "pro", "podcaster"] as const).map((key) => {
          const t = TIERS[key];
          const selected = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex-1 py-3 text-sm font-semibold transition border-b-2 flex items-center justify-center gap-1.5 ${
                selected
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {t.name}
              {t.comingSoon && (
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tier content */}
      <div className="bg-[#0f0f12] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-2xl font-black">{tier.name}</h3>
          {tier.badge}
        </div>
        <p className="text-sm text-white/60 mb-5">{tier.tagline}</p>

        <ul className="space-y-2.5 mb-4">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/85">
              <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {tier.comingSoon && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 text-center">
              Coming soon — you'll be able to upgrade from your profile once live
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
