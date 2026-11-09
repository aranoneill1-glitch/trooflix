"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Wallet, ArrowDownRight, ArrowUpRight, X, CheckCircle2 } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "payouts">("history");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [buying, setBuying] = useState(false);
  
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutStatus, setPayoutStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [payoutError, setPayoutError] = useState("");

  const fetchWallet = () => {
    getCachedUser().then(u => {
      if (u) {
        fetch(`/api/wallet?userId=${u.id}&t=${Date.now()}`).then(r => r.json()).then(d => {
          setBalance(d.balance || 0);
          setTransactions(d.transactions || []);
          setLoading(false);
        });
      }
    });
  };

  useEffect(() => {
    fetchWallet();
    document.addEventListener("visibilitychange", fetchWallet);
    window.addEventListener("focus", fetchWallet);
    window.addEventListener("tip-sent", fetchWallet);
    return () => {
      document.removeEventListener("visibilitychange", fetchWallet);
      window.removeEventListener("focus", fetchWallet);
      window.removeEventListener("tip-sent", fetchWallet);
    };
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
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-white/50">Available Balance</p>
              <span className="text-[10px] bg-[#E53945]/20 text-[#E53945] px-2 py-0.5 rounded-full font-bold">1 Coin = $1.00 USD</span>
            </div>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-black">{loading ? "..." : Number(balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              <span className="text-lg text-white/50 font-bold">TrooCoins</span>
            </div>
            <button onClick={() => setShowModal(true)} className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">
              Top Up Coins
            </button>
            <button onClick={() => setShowPayout(true)} className="w-full mt-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3.5 rounded-xl transition">
              Request Payout (Creators Only)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-white/10 mb-6">
          <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold transition-colors ${activeTab === "history" ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>History</button>
          <button onClick={() => setActiveTab("payouts")} className={`pb-3 text-sm font-bold transition-colors ${activeTab === "payouts" ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>Payouts</button>
        </div>

        {transactions.filter(t => activeTab === "history" ? true : t.type === "payout").length === 0 ? (
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-8 text-center">
            <p className="text-white/40">No {activeTab} found.</p>
          </div>
        ) : (
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
            {transactions.filter(t => activeTab === "history" ? true : t.type === "payout").map(t => {
              const isPayout = t.type === "payout";
              const isPaid = isPayout && t.status === "completed";
              const isCancelled = isPayout && t.status === "cancelled";
              
              return (
                <div key={t.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === "topup" ? "bg-green-500/20 text-green-500" : isPayout ? (isPaid ? "bg-green-500/20 text-green-500" : isCancelled ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500") : "bg-red-500/20 text-red-500"}`}>
                      {t.type === "topup" ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {t.type === "topup" ? "Top Up" : t.type === "tip" ? "Tip Sent" : isPayout ? `Payout ${isPaid ? "Paid" : isCancelled ? "Cancelled" : "Pending"}` : "Subscription"}
                        {isPayout && <span className="text-[9px] font-mono bg-white/5 text-white/40 px-1.5 py-0.5 rounded">PAY-{t.id.split("-")[0].toUpperCase()}</span>}
                      </p>
                      <p className="text-xs text-white/50">{new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${t.type === "topup" ? "text-green-500" : isCancelled ? "text-white/40 line-through" : "text-white"}`}>
                    {t.type === "topup" ? "+" : "-"}{Number(t.amount).toFixed(2)}
                  </span>
                </div>
              );
            })}
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
            <p className="text-sm text-white/50 mb-6">1 Coin = $1.00</p>
            <div className="space-y-3">
              {[{c: 5, p: 500}, {c: 10, p: 1000}, {c: 25, p: 2500}, {c: 50, p: 5000}].map(pkg => (
                <button key={pkg.c} disabled={buying} onClick={() => buyCoins(pkg.c, pkg.p)} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-[#E53945] hover:bg-[#E53945]/10 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black">C</div>
                    <div className="text-left">
                      <p className="font-bold">{pkg.c} Coin{pkg.c !== 1 ? "s" : ""}</p>
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

      {showPayout && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPayout(false)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPayout(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
            <h2 className="text-2xl font-black mb-1">Withdraw</h2>
            <p className="text-sm text-white/50 mb-6">Request a manual payout to your bank.</p>
            
            {payoutStatus === "success" ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold mb-1">Request Sent!</h4>
                <p className="text-sm text-white/50">The admin will process your payment shortly.</p>
              </div>
            ) : (
              <>
                <label className="text-xs font-bold text-white/50 mb-2 block">Amount to Withdraw ($)</label>
                <input type="number" step="1" min="1" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="e.g. 50" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] mb-4" />
                {payoutStatus === "error" && <p className="text-red-400 text-sm mb-4">{payoutError}</p>}
                <button 
                  onClick={async () => {
                    setPayoutStatus("loading");
                    const u = await getCachedUser();
                    const res = await fetch("/api/wallet/request-payout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u?.id, amount: Number(payoutAmount) }) });
                    const d = await res.json();
                    if (res.ok) { setPayoutStatus("success"); fetchWallet(); }
                    else { setPayoutStatus("error"); setPayoutError(d.error); }
                  }}
                  disabled={!payoutAmount || payoutStatus === "loading"}
                  className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition"
                >
                  {payoutStatus === "loading" ? "Requesting..." : "Request Payout"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <MobileBottomNav />
    </main>
  );
}