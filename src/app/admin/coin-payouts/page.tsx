"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, DollarSign } from "lucide-react";

export default function AdminCoinPayouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/admin/coin-payouts?t=" + Date.now());
    const d = await res.json();
    setPayouts(d.payouts || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (id: string) => {
    await fetch("/api/admin/coin-payouts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition"><ChevronLeft size={16} /> Back to Admin</Link>
      <h1 className="text-2xl font-black mb-1 flex items-center gap-2"><DollarSign className="text-green-500" /> Coin Payouts</h1>
      <p className="text-white/50 text-sm mb-6">Manual payouts requested by creators.</p>

      {loading ? <p className="text-white/50">Loading...</p> : payouts.length === 0 ? <p className="text-white/50 p-8 bg-[#141418] rounded-xl text-center">No pending payouts.</p> : (
        <div className="bg-[#141418] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-white/50">
              <tr><th className="px-5 py-3">Creator</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payouts.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-semibold">{p.username || p.sender_id.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-green-400 font-bold">${(p.amount / 100).toFixed(2)}</td>
                  <td className="px-5 py-4 text-white/50">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => markPaid(p.id)} className="inline-flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded transition"><CheckCircle2 size={14} /> Mark Paid</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}