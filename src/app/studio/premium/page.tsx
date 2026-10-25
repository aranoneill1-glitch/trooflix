"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Check, DollarSign, Users, TrendingUp, Sparkles, Eye } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Stats = {
  active_subscribers: number;
  monthly_gross_cents: number;
  monthly_net_cents: number;
};

function dollars(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PremiumSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [priceInput, setPriceInput] = useState(""); // dollars as string
  const [stats, setStats] = useState<Stats>({
    active_subscribers: 0,
    monthly_gross_cents: 0,
    monthly_net_cents: 0,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  // Preview states
  const [creatorName, setCreatorName] = useState("Your Channel");
  const [creatorPhoto, setCreatorPhoto] = useState("");

  const load = async (uid: string) => {
    try {
      // 1. Fetch Premium Stats
      const res = await fetch(`/api/creator/premium?user_id=${uid}`);
      const d = await res.json();
      if (!res.ok) {
        setStatus("❌ " + (d.error || "Could not load"));
        return;
      }
      setEnabled(!!d.premium.enabled);
      setPriceInput(
        d.premium.price_cents ? (d.premium.price_cents / 100).toFixed(2) : ""
      );
      setStats(d.stats);

      // 2. Fetch Creator Info for the Live Preview
      const crRes = await fetch(`/api/me/creator?user_id=${uid}`).then((r) => r.json());
      if (crRes.creator) {
        setCreatorName(crRes.creator.name);
        if (crRes.creator.photoUrl) setCreatorPhoto(crRes.creator.photoUrl);
      }
    } catch {
      setStatus("❌ Network error");
    }
  };

  useEffect(() => {
    getCachedUser().then((user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      load(user.id).finally(() => setLoading(false));
    });
  }, []);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus("");

    // Parse $ input → cents
    let priceCents: number | null = null;
    if (priceInput.trim() !== "") {
      const n = Number(priceInput.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(n)) {
        setStatus("❌ Enter a valid price");
        setSaving(false);
        return;
      }
      priceCents = Math.round(n * 100);
    }

    try {
      const res = await fetch("/api/creator/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, enabled, price_cents: priceCents }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus("❌ " + (d.error || "Could not save"));
      } else {
        setStatus("✅ Saved");
        setTimeout(() => setStatus(""), 2500);
        await load(userId);
      }
    } catch {
      setStatus("❌ Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <p className="text-white/40 text-sm font-medium">Loading Settings…</p>
        </div>
      </div>
    );
  }

  // Determine display price for the preview
  const displayPrice = priceInput ? Number(priceInput).toFixed(2) : "4.99";

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition"
      >
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight flex items-center gap-2">
          Premium Subscriptions <Sparkles size={20} className="text-yellow-500" />
        </h1>
        <p className="text-white/50 text-sm max-w-2xl">
          Charge your superfans for exclusive episodes. You keep 90% of every subscription — Trooflix takes 10% to cover payment processing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Row */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-[#0f0f12]/80 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Users size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Subscribers</span>
              </div>
              <p className="text-2xl font-black">{stats.active_subscribers.toLocaleString()}</p>
            </div>
            
            <div className="bg-[#0f0f12]/80 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <DollarSign size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Monthly Gross</span>
              </div>
              <p className="text-2xl font-black">{dollars(stats.monthly_gross_cents)}</p>
            </div>

            <div className="bg-[#0f0f12]/80 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <TrendingUp size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Your 90%</span>
              </div>
              <p className="text-2xl font-black text-emerald-400">{dollars(stats.monthly_net_cents)}</p>
            </div>
          </section>

          {/* Controls Box */}
          <section className="bg-[#0f0f12] border border-white/[0.06] rounded-2xl p-5 md:p-6 space-y-6">
            
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold mb-1">Enable Premium Content</h2>
                <p className="text-xs text-white/50">
                  When on, viewers can subscribe to you directly for premium episodes.
                </p>
              </div>
              <button
                onClick={() => setEnabled((v) => !v)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  enabled ? "bg-red-600" : "bg-white/15"
                }`}
                aria-pressed={enabled}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="h-px bg-white/5" />

            {/* Price Input */}
            <div className={`transition-opacity duration-300 ${enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <label className="text-sm font-bold text-white/90 block mb-1">
                Monthly Subscription Price
              </label>
              <p className="text-xs text-white/50 mb-4">
                You set the price. Stripe minimum is $4.99.
              </p>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="4.99"
                    disabled={!enabled}
                    className="w-40 bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-lg font-bold outline-none focus:border-red-600 transition"
                  />
                </div>
                <span className="text-white/50 font-medium">/ month</span>
              </div>
              
              <p className="text-[11px] text-white/40 mt-3 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Changing the price affects new subscribers only — existing subscribers keep their current rate.
              </p>
            </div>

          </section>

          {/* Status Message */}
          {status && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                status.startsWith("✅")
                  ? "bg-emerald-950/30 border border-emerald-600/40 text-emerald-300"
                  : "bg-red-950/30 border border-red-600/40 text-red-300"
              }`}
            >
              {status}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-8 py-3.5 rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            <Check size={18} /> {saving ? "Saving…" : "Save Premium Settings"}
          </button>

          <p className="text-[12px] text-white/40 pt-4 border-t border-white/5">
            Next step: mark individual episodes as premium in{" "}
            <Link href="/studio/episodes" className="text-white underline hover:text-red-400 transition">
              Studio → Episodes
            </Link>
            .
          </p>
        </div>

        {/* RIGHT COLUMN: Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="flex items-center gap-2 mb-4 text-white/50">
              <Eye size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Fan View Preview</h3>
            </div>
            
            {/* Preview Card */}
            <div className={`relative rounded-3xl border border-white/10 p-6 overflow-hidden transition-all duration-300 ${enabled ? 'bg-gradient-to-br from-[#1a1a1f] to-[#0a0a0c] shadow-[0_20px_50px_-12px_rgba(220,38,38,0.2)]' : 'bg-[#0f0f12] opacity-60 grayscale-[50%]'}`}>
              {/* Subtle glow */}
              {enabled && (
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none" />
              )}
              
              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center text-2xl font-black mb-4 ring-2 ring-white/10 overflow-hidden">
                  {creatorPhoto ? (
                    <img src={creatorPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    creatorName.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">{creatorName}</h3>
                <p className="text-xs text-white/50 mb-6">Premium Access</p>
                
                <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 mb-6">
                  <p className="text-3xl font-black text-white tabular-nums">
                    ${enabled ? displayPrice : "0.00"}<span className="text-sm font-medium text-white/50 ml-1">/mo</span>
                  </p>
                  <p className="text-[11px] text-emerald-400 mt-1 font-semibold">Cancel anytime</p>
                </div>

                <button className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${enabled ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-white/10 text-white/50 cursor-not-allowed'}`}>
                  {enabled ? "Subscribe Now" : "Subscriptions Paused"}
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-white/30 mt-4">
              This is how your subscription card will appear on your creator page.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
