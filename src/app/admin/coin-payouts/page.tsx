"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, DollarSign, XCircle, Clock } from "lucide-react";

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

  const handleAction = async (id: string, action: "paid" | "cancel") => {
    if (action === "cancel" && !confirm("Are you sure you want to cancel this payout? The coins will be refunded to the creator.")) return;
    await fetch("/api/admin/coin-payouts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    load();
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition"><ChevronLeft size={16} /> Back to Admin</Link>
      <h1 className="text-2xl md:text-3xl font-black mb-1 flex items-center gap-2"><DollarSign className="text-green-500" size={28} /> Coin Payouts</h1>
      <p className="text-white/50 text-sm mb-8">Manage manual payout requests from creators.</p>

      {loading ? <p className="text-white/50">Loading...</p> : payouts.length === 0 ? <p className="text-white/50 p-8 bg-[#141418] rounded-xl text-center border border-white/5">No payout requests found.</p> : (
        <div className="bg-[#141418] border border-white/5 rounded-2xl overflow-hidden">
          {payouts.map(p => (
            <div key={p.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-b border-white/5 last:border-0 gap-4 hover:bg-white/[0.02] transition">
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">PAY-{p.id.split("-")[0].toUpperCase()}</span>
                  <span className="font-bold text-white truncate">{p.username}</span>
                </div>
                <p className="text-xs text-white/40 flex items-center gap-1 mb-1"><Clock size={12}/> {formatDate(p.created_at)}</p>
                {p.bank_details ? (
                  <p className="text-xs text-white/60 bg-white/5 inline-block px-2 py-1 rounded">Bank: {p.bank_details.bank_name} | Acc: {p.bank_details.account_number} | Name: {p.bank_details.account_name}</p>
                ) : (
                  <p className="text-xs text-red-400">No bank details provided yet.</p>
                )}
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="text-left md:text-right">
                  <p className="text-sm text-white/40 mb-0.5">Amount</p>
                  <p className="text-lg font-black text-green-400">${Number(p.amount).toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-2">
                  {p.status === "pending" ? (
                    <>
                      <button onClick={() => handleAction(p.id, "paid")} className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition"><CheckCircle2 size={14} /> Pay</button>
                      <button onClick={() => handleAction(p.id, "cancel")} className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold px-4 py-2 rounded-lg transition"><XCircle size={14} /> Cancel</button>
                    </>
                  ) : p.status === "completed" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 px-3 py-2 rounded-lg"><CheckCircle2 size={14} /> Paid</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-400/10 px-3 py-2 rounded-lg"><XCircle size={14} /> Cancelled</span>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}