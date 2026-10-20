"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Check, DollarSign, Users, TrendingUp } from "lucide-react";
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

  const load = async (uid: string) => {
    try {
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
    return <div className="p-8 text-white/50 text-center">Loading…</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition"
      >
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <h1 className="text-2xl font-black mb-1">Premium Subscriptions</h1>
      <p className="text-white/50 text-sm mb-6">
        Charge your superfans for exclusive episodes. You keep 90% of every
        subscription — Trooflix takes 10% to cover payment processing.
      </p>

      {/* Stats row */}
      <section className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#141418] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
            <Users size={13} /> Subscribers
          </div>
          <p className="text-2xl font-black">{stats.active_subscribers}</p>
        </div>
        <div className="bg-[#141418] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
            <DollarSign size={13} /> Monthly gross
          </div>
          <p className="text-2xl font-black">
            {dollars(stats.monthly_gross_cents)}
          </p>
        </div>
        <div className="bg-[#141418] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
            <TrendingUp size={13} /> Your 90%
          </div>
          <p className="text-2xl font-black text-green-400">
            {dollars(stats.monthly_net_cents)}
          </p>
        </div>
      </section>

      {/* Toggle + price */}
      <section className="bg-[#141418] border border-white/5 rounded-xl p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold mb-0.5">Enable Premium content</h2>
            <p className="text-xs text-white/50">
              When on, viewers can subscribe to you directly for premium episodes.
            </p>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`relative w-12 h-7 rounded-full transition ${
              enabled ? "bg-red-600" : "bg-white/15"
            }`}
            aria-pressed={enabled}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-2">
            Monthly price <span className="text-white/30">(you set it — anything above $4.99, anything)</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-lg">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="4.99"
              disabled={!enabled}
              className="w-32 bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600 disabled:opacity-40"
            />
            <span className="text-white/50 text-sm">/ month</span>
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Stripe minimum is $4.99. Changing the price affects new subscribers only —
            existing subscribers keep their current rate.
          </p>
        </div>
      </section>

      {status && (
        <div
          className={`rounded px-4 py-3 text-sm mb-4 ${
            status.startsWith("✅")
              ? "bg-green-950/30 border border-green-600/40 text-green-300"
              : "bg-red-950/30 border border-red-600/40 text-red-300"
          }`}
        >
          {status}
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold px-6 py-3 rounded-lg transition"
      >
        <Check size={16} /> {saving ? "Saving…" : "Save premium settings"}
      </button>

      <p className="text-[11px] text-white/40 mt-6">
        Next step: mark individual episodes as premium in{" "}
        <Link href="/studio/episodes" className="underline hover:text-white">
          Studio → Episodes
        </Link>
        .
      </p>
    </div>
  );
}
