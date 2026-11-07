"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, X, Sparkles, Crown, Video } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

type Tier = "free" | "plus" | "creator";

const FEATURES: { label: string; free: boolean; plus: boolean; creator: boolean }[] = [
  { label: "Watch unlimited Shorts", free: true, plus: true, creator: true },
  { label: "Like, comment & share", free: true, plus: true, creator: true },
  { label: "Send direct messages", free: true, plus: true, creator: true },
  { label: "Buy merch & books", free: true, plus: true, creator: true },
  { label: "Upload Shorts (≤3 min)", free: true, plus: true, creator: true },
  { label: "3-min long-form previews", free: true, plus: false, creator: false },
  { label: "Unlimited long-form viewing", free: false, plus: true, creator: true },
  { label: "Upload Shorts (any length)", free: false, plus: true, creator: true },
  { label: "Watch live streams (public)", free: false, plus: true, creator: true },
  { label: "Upload merch / open shop", free: false, plus: true, creator: true },
  { label: "Upload long-form (podcasts, docs)", free: false, plus: false, creator: true },
  { label: "Post Tweets", free: false, plus: false, creator: true },
  { label: "Go Live (broadcast)", free: false, plus: false, creator: true },
  { label: "Full Creator Dashboard", free: false, plus: false, creator: true },
  { label: "Custom profile theme", free: false, plus: false, creator: true },
  { label: "Red glass tick", free: false, plus: true, creator: false },
  { label: "Gold tick", free: false, plus: false, creator: true },
];

const isIOS = typeof window !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

export default function UpgradePage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [showPromo, setShowPromo] = useState<false | "plus" | "creator">(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) { setLoading(false); return; }
      try {
        const res = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
        const d = await res.json();
        const profile = d.profile;
        const raw = String(profile?.tier || "free").toLowerCase();
        let normalized: Tier;
        if (raw === "creator" || raw === "podcaster" || raw === "pro") normalized = "creator";
        else if (raw === "plus" || raw === "pass" || raw === "troopass") normalized = "plus";
        else normalized = "free";
        if (normalized !== "free" && profile?.plus_expires_at) {
          if (new Date(profile.plus_expires_at) < new Date()) normalized = "free";
        }
        setCurrentTier(normalized);
      } catch {}
      setLoading(false);
    });
  }, []);

  const handlePlusCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) { router.push("/login"); return; }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, type: "pass" }),
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

  const handleCreatorCheckout = async () => {
    setCreatorLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) { router.push("/login"); return; }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, type: "podcaster" }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "Could not start checkout");
    } catch {
      alert("Network error");
    } finally {
      setCreatorLoading(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");
    try {
      const user = await getCachedUser();
      if (!user) { router.push("/login"); return; }
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Invalid promo code");
        return;
      }
      setPromoSuccess(`Success! You now have ${data.tier === "creator" ? "Creator" : "Plus"} access.`);
      setTimeout(() => { window.location.href = "/creator-dashboard"; }, 1500);
    } catch {
      setPromoError("Network error. Please try again.");
    } finally {
      setPromoLoading(false);
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
          <h1 className="text-3xl md:text-5xl font-black mb-3">Unlock everything on Trooflix</h1>
          <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto">
            Watch everything, or become a creator and monetize your work. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <TierCard
            name="Free"
            tagline="Start exploring"
            price="$0"
            priceSub="forever"
            icon={Sparkles}
            badge={null}
            features={[
              "Watch unlimited Shorts",
              "3-min long-form previews",
              "Like, comment & send DMs",
              "Buy merch & books",
              "Upload Shorts (≤3 min)",
            ]}
            isCurrent={currentTier === "free"}
            ctaLabel={currentTier === "free" ? "Your current plan" : "Downgrade to Free"}
            ctaDisabled={true}
          />

          <TierCard
            name="Plus"
            tagline="The full viewer"
            price="$3.99"
            priceSub="/month"
            icon={Crown}
            badge={<VerifiedBadge size={20} variant="plus_red" />}
            features={[
              "Everything in Free",
              "Unlimited long-form viewing",
              "Upload Shorts (any length)",
              "Watch live streams (public)",
              "Upload merch / open shop",
              "Red glass tick",
            ]}
            isCurrent={currentTier === "plus"}
            ctaLabel={
              currentTier === "plus"
                ? "You have Plus"
                : currentTier === "creator"
                ? "Included in Creator"
                : checkoutLoading
                ? "Redirecting…"
                : "Get Plus — $3.99"
            }
            onClick={handlePlusCheckout}
            ctaDisabled={currentTier !== "free" || checkoutLoading}
            highlight={true}
            onPromoClick={currentTier === "free" ? () => setShowPromo(showPromo === "plus" ? false : "plus") : undefined}
            showPromoInput={showPromo === "plus"}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            onApplyPromo={handleRedeemPromo}
            promoLoading={promoLoading}
            promoError={promoError}
            promoSuccess={promoSuccess}
          />

          <TierCard
            name="Creator"
            tagline="Build your empire"
            price="$9.99"
            priceSub="/month"
            icon={Video}
            badge={<VerifiedBadge size={20} variant="creator_gold" />}
            features={[
              "Everything in Plus",
              "Upload long-form (podcasts, docs)",
              "Post Tweets",
              "Go Live (broadcast)",
              "Full Creator Dashboard",
              "Custom profile theme",
              "Gold tick",
            ]}
            isCurrent={currentTier === "creator"}
            ctaLabel={
              currentTier === "creator"
                ? "You're a Creator"
                : creatorLoading
                ? "Redirecting…"
                : "Get Creator — $9.99"
            }
            onClick={handleCreatorCheckout}
            ctaDisabled={currentTier === "creator" || creatorLoading}
            onPromoClick={currentTier !== "creator" ? () => setShowPromo(showPromo === "creator" ? false : "creator") : undefined}
            showPromoInput={showPromo === "creator"}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            onApplyPromo={handleRedeemPromo}
            promoLoading={promoLoading}
            promoError={promoError}
            promoSuccess={promoSuccess}
          />
        </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-lg font-bold">Compare all plans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3 font-semibold text-white/60 w-1/2">Feature</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Free</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Plus</th>
                  <th className="text-center px-3 py-3 font-semibold text-white/60">Creator</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 text-white/80">{f.label}</td>
                    <td className="text-center px-3 py-3">
                      {f.free ? <Check size={16} className="text-green-500 mx-auto" /> : <X size={16} className="text-white/20 mx-auto" />}
                    </td>
                    <td className="text-center px-3 py-3">
                      {f.plus ? <Check size={16} className="text-green-500 mx-auto" /> : <X size={16} className="text-white/20 mx-auto" />}
                    </td>
                    <td className="text-center px-3 py-3">
                      {f.creator ? <Check size={16} className="text-green-500 mx-auto" /> : <X size={16} className="text-white/20 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
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
  icon: Icon,
  features,
  isCurrent,
  ctaLabel,
  ctaDisabled,
  highlight,
  onClick,
  price,
  priceSub,
  onPromoClick,
  showPromoInput,
  promoCode,
  setPromoCode,
  onApplyPromo,
  promoLoading,
  promoError,
  promoSuccess,
}: {
  name: string;
  tagline: string;
  badge: React.ReactNode;
  icon: any;
  features: string[];
  isCurrent: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  highlight?: boolean;
  onClick?: () => void;
  price: string;
  priceSub: string;
  onPromoClick?: () => void;
  showPromoInput?: boolean;
  promoCode?: string;
  setPromoCode?: (v: string) => void;
  onApplyPromo?: () => void;
  promoLoading?: boolean;
  promoError?: string;
  promoSuccess?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col ${
        highlight
          ? "bg-white/10 backdrop-blur-xl border-2 border-red-600/40 shadow-[0_0_30px_rgba(229,57,69,0.15)]"
          : "bg-white/5 backdrop-blur-xl border border-white/10"
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
        <Icon size={22} className={highlight ? "text-[#E53945]" : "text-white/60"} />
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

      {onPromoClick && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {!showPromoInput ? (
            <button
              onClick={onPromoClick}
              className="w-full text-xs text-[#E53945] hover:text-[#d12e39] font-bold transition text-center"
            >
              Have a promo code? →
            </button>
          ) : (
            <div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={promoCode || ""}
                  onChange={(e) => setPromoCode && setPromoCode(e.target.value.toUpperCase())}
                  placeholder="PROMO CODE"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white uppercase tracking-wider font-mono focus:outline-none focus:border-[#E53945] transition"
                  disabled={promoLoading}
                />
                <button
                  onClick={onApplyPromo}
                  disabled={promoLoading || !promoCode?.trim()}
                  className="bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold text-xs px-3 rounded-lg transition"
                >
                  {promoLoading ? "..." : "Apply"}
                </button>
              </div>
              {promoError && (
                <p className="text-[10px] text-red-400 mt-1.5">{promoError}</p>
              )}
              {promoSuccess && (
                <p className="text-[10px] text-green-400 mt-1.5">{promoSuccess}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
