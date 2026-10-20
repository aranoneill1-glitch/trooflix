"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Download, CheckCircle, Clock } from "lucide-react";

type PayoutRow = {
  creator_id: number;
  name: string;
  slug: string;
  subscriber_count: number;
  sub_gross_cents: number;
  merch_gross_cents: number;
  total_gross_cents: number;
  fee_cents: number;
  net_cents: number;
  paid_this_month: boolean;
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminPayouts() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/payouts");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load");
      setRows(d.rows || []);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (row: PayoutRow) => {
    setPayingId(row.creator_id);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error("Failed to mark paid");
      await load();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;
  if (error) return <div className="p-8 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to Admin
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">Creator Payouts</h1>
          <p className="text-white/50 text-sm">Who you owe this month (Subscriptions + Merch).</p>
        </div>
        <a
          href="/api/admin/payouts/export"
          download
          className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Download size={16} /> Export CSV
        </a>
      </div>

      <div className="bg-[#141418] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-white/50">
              <tr>
                <th className="px-5 py-3 font-medium">Creator</th>
                <th className="px-5 py-3 font-medium">Subs</th>
                <th className="px-5 py-3 font-medium">Sub Gross</th>
                <th className="px-5 py-3 font-medium">Merch Gross</th>
                <th className="px-5 py-3 font-medium">Total Gross</th>
                <th className="px-5 py-3 font-medium text-green-400">Owed (90%)</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.creator_id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-white/40">/{r.slug}</p>
                  </td>
                  <td className="px-5 py-4">{r.subscriber_count}</td>
                  <td className="px-5 py-4 text-white/70">{dollars(r.sub_gross_cents)}</td>
                  <td className="px-5 py-4 text-white/70">{dollars(r.merch_gross_cents)}</td>
                  <td className="px-5 py-4 font-bold">{dollars(r.total_gross_cents)}</td>
                  <td className="px-5 py-4 text-green-400 font-bold">{dollars(r.net_cents)}</td>
                  <td className="px-5 py-4 text-right">
                    {r.paid_this_month ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                        <CheckCircle size={12} /> Paid
                      </span>
                    ) : (
                      <button
                        onClick={() => markPaid(r)}
                        disabled={payingId === r.creator_id}
                        className="inline-flex items-center gap-1.5 text-xs text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-1.5 rounded transition"
                      >
                        <Clock size={12} /> {payingId === r.creator_id ? "Saving…" : "Mark Paid"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-white/50">
                    No active subscriptions or merch orders yet.
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
