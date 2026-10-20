"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

type Tier = "user" | "pro" | "podcaster";

const TIERS: Record<Tier, {
  name: string;
  tagline: string;
  badge?: React.ReactNode;
  price: string;
  priceSub: string;
  features: string[];
}> = {
  user: {
    name: "Free",
    tagline: "Start posting today",
    price: "$0",
    priceSub: "forever",
    features: [
      "Watch all reels (always free)",
      "Post 90-second reels",
      "Post images & Troos",
      "120-second previews of podcasts",
    ],
  },
  pro: {
    name: "Trooflix Pass",
    tagline: "Unlock everything",
    badge: <VerifiedBadge size={20} variant="red" />,
    price: "$9.99",
    priceSub: "per month",
    features: [
      "Watch all podcasts (full length)",
      "Watch all documentaries",
      "Unlimited-length reels",
      "Red verified badge",
      "Support independent creators",
    ],
  },
  podcaster: {
    name: "Podcaster",
    tagline: "Create & monetize",
    badge: <VerifiedBadge size={20} variant="gold" />,
    price: "$15.99",
    priceSub: "per month",
    features: [
      "Everything in Trooflix Pass",
      "Post podcasts & documentaries",
      "Dedicated podcaster page",
      "Featured on home page",
      "Gold verified badge",
    ],
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
        <p className="text-sm text-white/60 mb-3">{tier.tagline}</p>

        <div className="mb-5">
          <span className="text-3xl font-black">{tier.price}</span>
          <span className="text-sm text-white/50 ml-1">{tier.priceSub}</span>
        </div>

        <ul className="space-y-2.5 mb-4">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/85">
              <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
