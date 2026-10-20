"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Landmark, Wallet, TrendingUp, ShieldCheck, Mic, Users } from "lucide-react";

type BankData = {
  pass_count: number;
  pass_gross_cents: number;
  podcaster_count: number;
  podcaster_gross_cents: number;
  creator_sub_count: number;
  creator_sub_your_cut_cents: number;
  merch_count: number;
  merch_your_cut_cents: number;
  stripe_fees_cents: number;
  net_bank_cents: number;
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminBank() {
  const [data, setData] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/bank")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;
  if (error) return <div className="p-8 text-red-500 text-center">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to Admin
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
          <Landmark size={24} className="text-green-500" /> Trooflix Bank
        </h1>
        <p className="text-white/50 text-sm">Your live platform earnings and estimated payouts.</p>
      </div>

      {/* Main Balance */}
      <div className="bg-[#141418] border border-green-500/30 rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Landmark size={120} />
        </div>
        <p className="text-sm text-white/50 font-bold uppercase tracking-widest mb-2 relative z-10">Estimated Net Bank Balance</p>
        <p className="text-5xl font-black text-green-400 relative z-10">{dollars(data.net_bank_cents)}</p>
        <p className="text-xs text-white/40 mt-3 relative z-10">Calculated after estimated Stripe fees. Actual payout depends on your payout schedule.</p>
      </div>

      {/* Breakdown */}
      <h2 className="text-lg font-bold mb-4">Revenue Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#141418] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white/50"><TrendingUp size={16} /> Trooflix Passes</div>
            <span className="text-xs bg-white/5 px-2 py-1 rounded text-white/60">{data.pass_count} Subs</span>
          </div>
          <p className="text-2xl font-black">{dollars(data.pass_gross_cents)}</p>
          <p className="text-xs text-green-400 mt-1">You keep 100% of this</p>
        </div>

        <div className="bg-[#141418] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white/50"><Mic size={16} /> Podcaster Tiers</div>
            <span className="text-xs bg-white/5 px-2 py-1 rounded text-white/60">{data.podcaster_count} Subs</span>
          </div>
          <p className="text-2xl font-black">{dollars(data.podcaster_gross_cents)}</p>
          <p className="text-xs text-green-400 mt-1">You keep 100% of this</p>
        </div>

        <div className="bg-[#141418] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white/50"><Users size={16} /> Creator Subs</div>
            <span className="text-xs bg-white/5 px-2 py-1 rounded text-white/60">{data.creator_sub_count} Subs</span>
          </div>
          <p className="text-2xl font-black">{dollars(data.creator_sub_your_cut_cents)}</p>
          <p className="text-xs text-white/40 mt-1">Your 10% platform fee</p>
        </div>

        <div className="bg-[#141418] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white/50"><Wallet size={16} /> Merch</div>
            <span className="text-xs bg-white/5 px-2 py-1 rounded text-white/60">{data.merch_count} Orders</span>
          </div>
          <p className="text-2xl font-black">{dollars(data.merch_your_cut_cents)}</p>
          <p className="text-xs text-white/40 mt-1">Your 10% platform fee</p>
        </div>

        <div className="bg-[#141418] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-red-400"><ShieldCheck size={16} /> Est. Stripe Fees</div>
          </div>
          <p className="text-2xl font-black text-red-400">-{dollars(data.stripe_fees_cents)}</p>
          <p className="text-xs text-white/40 mt-1">Transaction costs across all payments</p>
        </div>
      </div>
    </div>
  );
}
