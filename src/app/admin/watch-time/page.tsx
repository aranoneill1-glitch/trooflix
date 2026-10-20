"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, PlayCircle, DollarSign, Clock } from "lucide-react";

type PoolRow = {
  creator_id: number;
  name: string;
  total_seconds: number;
  total_minutes: number;
  share_percentage: string;
  earnings_cents: number;
};

export default function AdminWatchTime() {
  const [rows, setRows] = useState<PoolRow[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [poolAmount, setPoolAmount] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const poolCents = Math.round(Number(poolAmount) * 100);
      const res = await fetch(`/api/admin/watch-time-pool?poolCents=${poolCents}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load");
      setRows(d.rows || []);
      setTotalMinutes(d.total_platform_minutes || 0);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to Admin
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">Watch Time Pool</h1>
          <p className="text-white/50 text-sm">Distribute the monthly engagement pool based on actual watch minutes.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#141418] border border-white/10 rounded-lg p-1.5">
          <span className="text-sm text-white/50 pl-2">Pool Amount ($)</span>
          <input
            type="number"
            value={poolAmount}
            onChange={(e) => setPoolAmount(e.target.value)}
            className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm w-32 outline-none focus:border-red-600"
          />
          <button onClick={load} className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-1.5 rounded text-sm transition">
            Calculate
          </button>
        </div>
      </div>

      {error && <div className="p-4 mb-6 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">{error}</div>}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#141418] border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 text-white/50 mb-2"><PlayCircle size={16} /> Total Platform Watch Time</div>
          <p className="text-2xl font-black">{totalMinutes.toLocaleString()} <span className="text-sm font-normal text-white/40">mins</span></p>
        </div>
        <div className="bg-[#141418] border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 text-white/50 mb-2"><DollarSign size={16} /> Total Pool Available</div>
          <p className="text-2xl font-black text-green-400">${Number(poolAmount).toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141418] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-white/50">
              <tr>
                <th className="px-5 py-3 font-medium">Creator</th>
                <th className="px-5 py-3 font-medium">Watch Time</th>
                <th className="px-5 py-3 font-medium">Share %</th>
                <th className="px-5 py-3 font-medium text-green-400 text-right">Earned from Pool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.creator_id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-semibold">{r.name}</td>
                  <td className="px-5 py-4 flex items-center gap-1.5"><Clock size={14} className="text-white/40"/> {r.total_minutes.toLocaleString()} mins</td>
                  <td className="px-5 py-4 text-white/70">{r.share_percentage}%</td>
                  <td className="px-5 py-4 text-green-400 font-bold text-right">${(r.earnings_cents / 100).toFixed(2)}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-white/50">
                    No watch time logged yet for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
