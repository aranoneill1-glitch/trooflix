"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, X, Sparkles } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

type Tier = "user" | "pass" | "podcaster";

const FEATURES = [
  { label: "Watch reels (always free)", free: true, pass: true, podcaster: true },
  { label: "Post reels (up to 90s)", free: true, pass: true, podcaster: true },
  { label: "Post images & Troos", free: true, pass: true, podcaster: true },
  { label: "Watch full podcasts", free: false, pass: true, podcaster: true },
  { label: "Watch full documentaries", free: false, pass: true, podcaster: true },
  { label: "Unlimited-length reels", free: false, pass: true, podcaster: true },
  { label: "Red verified badge", free: false, pass: true, podcaster: false },
  { label: "Post full podcasts", free: false, pass: false, podcaster: true },
  { label: "Post documentaries", free: false, pass: false, podcaster: true },
  { label: "Dedicated podcaster page", free: false, pass: false, podcaster: true },
  { label: "Featured on home page", free: false, pass: false, podcaster: true },
  { label: "Gold verified badge", free: false, pass: false, podcaster: true },
];

export default function UpgradePage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<Tier>("user");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
        const d = await res.json();
        const profile = d.profile;

        if (profile?.tier === "podcaster") {
          setCurrentTier("podcaster");
        } else if (profile?.has_pass === true) {
          const expires = profile?.pass_expires_at;
          if (!expires || new Date(expires) > new Date()) {
            setCurrentTier("pass");
          } else {
            setCurrentTier("user");
          }
        } else {
          setCurrentTier("user");
        }
      } catch {}
      setLoading(false);
    });
  }, []);

  const handlePassCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, type: "pass" }),
      });

      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        alert(d.error || "Could not start checkout");
      }
    } catch {
      alert("Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

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
          <p className="text-xs tracking-[0.3em] text-red-500 font-bold mb-2">CHOOSE YOUR PLAN</p>
          <h1 className="text-3xl md:text-5xl font-black mb-3">Watch everything on Trooflix</h1>
          <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto">
            One pass. Every podcast, every documentary. Or become a creator and share your own.
          </p>
        </div>

        {/* 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* Free */}
          <TierCard
            name="Free"
            tagline="Browse & preview"
            price="$0"
            priceSub="forever"
            features={[
              "Watch reels (always free)",
              "Post reels up to 90s",
              "Post images & Troos",
              "120-second previews of podcasts",
            ]}
            isCurrent={currentTier === "user"}
            ctaLabel={currentTier === "user" ? "You're on Free" : "Current plan"}
            ctaDisabled={true}
          />

          {/* Trooflix Pass */}
          <TierCard
            name="Trooflix Pass"
            tagline="Unlock everything"
            badge={<VerifiedBadge size={20} variant="red" />}
            price="$9.99"
            priceSub="per month"
            features={[
              "Watch all podcasts (full length)",
              "Watch all documentaries",
              "Unlimited-length reels",
              "Red verified badge",
              "Support independent creators",
            ]}
            isCurrent={currentTier === "pass"}
            ctaLabel={
              currentTier === "pass"
                ? "You have Pass"
                : currentTier === "podcaster"
                ? "Included in Podcaster"
                : checkoutLoading
                ? "Redirecting…"
                : "Get Trooflix Pass"
            }
            onClick={handlePassCheckout}
            ctaDisabled={currentTier !== "user" || checkoutLoading}
            highlight={true}
          />

          {/* Podcaster */}
          <TierCard
            name="Podcaster"
            tagline="Create & monetize"
            badge={<VerifiedBadge size={20} variant="gold" />}
            price="$15.99"
            priceSub="per month"
            features={[
              "Everything in Pass",
              "Post podcasts & documentaries",
              "Dedicated podcaster page",
              "Featured on home page",
              "Gold verified badge",
              "Apply via our review process",
            ]}
            isCurrent={currentTier === "podcaster"}
            ctaLabel={currentTier === "podcaster" ? "You're a Podcaster" : "Apply to become a Podcaster"}
            onClick={() => router.push("/apply")}
            ctaDisabled={currentTier === "podcaster"}
          />
        </div>

        {/* Feature comparison */}
        <div className="bg-[#0f0f12] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-lg font-bold">Compare plans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 font-semibold text-white/60 w-1/2">Feature</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Free</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Pass</th>
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
                      {f.pass ? <Check size={16} className="inline text-green-500" /> : <X size={16} className="inline text-white/20" />}
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
          Secure payments powered by Stripe. Cancel anytime.
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
  onClick,
  price,
  priceSub,
}: {
  name: string;
  tagline: string;
  badge?: React.ReactNode;
  features: string[];
  isCurrent: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  highlight?: boolean;
  onClick?: () => void;
  price: string;
  priceSub: string;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col ${
        highlight
          ? "bg-gradient-to-b from-red-950/40 to-[#0f0f12] border-2 border-red-600/40"
          : "bg-[#0f0f12] border border-white/10"
      } ${isCurrent ? "ring-2 ring-white/20" : ""}`}
    >
      {highlight && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-red-600 rounded-full text-xs font-bold text-white flex items-center gap-1">
          <Sparkles size={11} /> MOST POPULAR
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
      <p className="text-sm text-white/50 mb-4">{tagline}</p>

      <div className="mb-4">
        <span className="text-3xl font-black">{price}</span>
        <span className="text-sm text-white/50 ml-1">{priceSub}</span>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/80">
            <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        disabled={ctaDisabled}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${
          isCurrent
            ? "bg-white/10 text-white/60 cursor-default"
            : ctaDisabled
            ? "bg-white/5 text-white/40 cursor-not-allowed"
            : highlight
            ? "bg-red-600 hover:bg-red-500 text-white"
            : "bg-white/10 hover:bg-white/20 text-white"
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
