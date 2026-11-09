"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Wallet, ArrowDownRight, ArrowUpRight, X } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    getCachedUser().then(u => {
      if (u) {
        fetch(`/api/wallet?userId=${u.id}`).then(r => r.json()).then(d => {
          setBalance(d.balance || 0);
          setTransactions(d.transactions || []);
          setLoading(false);
        });
      }
    });
  }, []);

  const buyCoins = async (coins: number, priceCents: number) => {
    setBuying(true);
    const u = await getCachedUser();
    if (!u) return;
    const res = await fetch("/api/stripe/coins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, coins, priceCents })
    });
    const d = await res.json();
    if (d.url) window.location.href = d.url;
    else alert("Error: " + d.error);
    setBuying(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-24">
        <div className="bg-gradient-to-br from-[#1c1c1e] to-[#0a0303] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E53945]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Wallet size={24} className="text-[#E53945]" />
              </div>
              <div>
                <h1 className="text-2xl font-black">My Wallet</h1>
                <p className="text-sm text-white/50">TrooBank</p>
              </div>
            </div>
            <p className="text-sm text-white/50 mb-2">Available Balance</p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-black">{loading ? "..." : balance.toLocaleString()}</span>
              <span className="text-lg text-white/50 font-bold">TrooCoins</span>
            </div>
            <button onClick={() => setShowModal(true)} className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">
              Top Up Coins
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-8 text-center">
            <p className="text-white/40">No transactions yet.</p>
          </div>
        ) : (
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === "topup" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                    {t.type === "topup" ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t.type === "topup" ? "Top Up" : t.type === "tip" ? "Tip Sent" : "Subscription"}</p>
                    <p className="text-xs text-white/50">{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-bold ${t.type === "topup" ? "text-green-500" : "text-white"}`}>
                  {t.type === "topup" ? "+" : "-"}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
              <X size={18} />
            </button>
            <h2 className="text-2xl font-black mb-1">Top Up</h2>
            <p className="text-sm text-white/50 mb-6">Select a package</p>
            <div className="space-y-3">
              {[{c: 500, p: 500}, {c: 1000, p: 1000}, {c: 2500, p: 2500}].map(pkg => (
                <button key={pkg.c} disabled={buying} onClick={() => buyCoins(pkg.c, pkg.p)} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-[#E53945] hover:bg-[#E53945]/10 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black">C</div>
                    <div className="text-left">
                      <p className="font-bold">{pkg.c.toLocaleString()} Coins</p>
                      <p className="text-xs text-white/50">${(pkg.p / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  <span className="text-[#E53945] font-bold text-sm opacity-0 group-hover:opacity-100 transition">Buy</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <MobileBottomNav />
    </main>
  );
}