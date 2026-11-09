"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Wallet, ArrowDownRight, ArrowUpRight, X, CheckCircle2, Building2, Bitcoin, Send, AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";

export default function WalletPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "payouts">("history");
  
  // Modals
  const [showTopUp, setShowTopUp] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [videoCache, setVideoCache] = useState<Record<number, any>>({});

  // Payout State
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "crypto">("bank");
  const [payoutStatus, setPayoutStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [payoutError, setPayoutError] = useState("");
  const [detailsType, setDetailsType] = useState<"bank" | "crypto">("bank");
  const [form, setForm] = useState({ accountName: "", bankName: "", accountNumber: "", iban: "", swiftBic: "", sortCode: "", cryptoAddress: "", cryptoNetwork: "USDT (TRC20)" });
  const [detailsStatus, setDetailsStatus] = useState<"idle"|"loading"|"success">("idle");

  // Top Up State
  const [customTopUp, setCustomTopUp] = useState("");
  const [buying, setBuying] = useState(false);

  // Send State
  const [sendUsername, setSendUsername] = useState("");
  const [sendSearchResults, setSendSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [sendError, setSendError] = useState("");

  const fetchWallet = () => {
    getCachedUser().then(u => {
      if (u) {
        setUserId(u.id);
        fetch(`/api/wallet?userId=${u.id}&t=${Date.now()}`).then(r => r.json()).then(d => {
          setBalance(d.balance || 0);
          setTransactions(d.transactions || []);
          setLoading(false);
        });
        fetch(`/api/wallet/bank-details?userId=${u.id}`).then(r => r.json()).then(d => {
          if (d.bankDetails) {
            setBankDetails(d.bankDetails);
            setPayoutMethod(d.bankDetails.payout_type);
            setForm({
              accountName: d.bankDetails.account_name || "", bankName: d.bankDetails.bank_name || "",
              accountNumber: d.bankDetails.account_number || "", iban: d.bankDetails.iban || "",
              swiftBic: d.bankDetails.swift_bic || "", sortCode: d.bankDetails.sort_code || "",
              cryptoAddress: d.bankDetails.crypto_address || "", cryptoNetwork: d.bankDetails.crypto_network || "USDT (TRC20)"
            });
          }
        });
      }
    });
  };

  useEffect(() => { fetchWallet(); }, []);

  useEffect(() => {
    if (sendUsername.length < 2) { setSendSearchResults([]); return; }
    const t = setTimeout(() => {
      setSearchingUsers(true);
      fetch(`/api/users?q=${encodeURIComponent(sendUsername)}`)
        .then(r => r.json())
        .then(d => setSendSearchResults(d.users || []))
        .finally(() => setSearchingUsers(false));
    }, 300);
    return () => clearTimeout(t);
  }, [sendUsername]);

  useEffect(() => {
    if (selectedTx && (selectedTx.type === "tip" || selectedTx.type === "send") && selectedTx.video_id && !videoCache[selectedTx.video_id]) {
      fetch("/api/videos").then(r => r.json()).then(vids => {
        const v = vids.find((x: any) => Number(x.id) === Number(selectedTx.video_id));
        if (v) setVideoCache(prev => ({ ...prev, [v.id]: v }));
      });
    }
  }, [selectedTx, videoCache]);

  const buyCoins = async (coins: number, priceCents: number) => {
    if (!userId) return;
    setBuying(true);
    const res = await fetch("/api/stripe/coins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, coins, priceCents }) });
    const d = await res.json();
    if (d.url) window.location.href = d.url;
    setBuying(false);
  };

  const submitPayout = async () => {
    setPayoutStatus("loading");
    const res = await fetch("/api/wallet/request-payout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, amount: Number(payoutAmount), method: payoutMethod }) });
    const d = await res.json();
    if (res.ok) { setPayoutStatus("success"); fetchWallet(); }
    else { setPayoutStatus("error"); setPayoutError(d.error); }
  };

  const saveDetails = async () => {
    setDetailsStatus("loading");
    const res = await fetch("/api/wallet/bank-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, payout_type: detailsType, ...form }) });
    if (res.ok) { setDetailsStatus("success"); fetchWallet(); setTimeout(() => setShowDetailsModal(false), 1500); }
  };

  const cancelPayout = async (id: string) => {
    if (!confirm("Are you sure? The funds will be returned to your wallet.")) return;
    try {
      const res = await fetch("/api/wallet/cancel-payout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payoutId: id, userId }) });
      const d = await res.json();
      if (res.ok) { setSelectedTx(null); fetchWallet(); }
      else { alert(d.error || "Failed to cancel payout."); }
    } catch (e) { alert("Network error."); }
  };

  const submitSend = async () => {
    setSendStatus("loading"); setSendError("");
    try {
      const res = await fetch("/api/wallet/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderId: userId, recipientUsername: sendUsername, amount: Number(sendAmount) }) });
      const d = await res.json();
      if (res.ok) { 
        setSendStatus("success"); fetchWallet(); 
        setTimeout(() => { setShowSendModal(false); setSendStatus("idle"); setSendUsername(""); setSendAmount(""); }, 2000); 
      } else { setSendStatus("error"); setSendError(d.error || "Transfer failed."); }
    } catch (e) { setSendStatus("error"); setSendError("Network error."); }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24 selection:bg-[#E53945]/30">
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#1c1c1e]/50 to-transparent pointer-events-none z-0" />
      <TopBar />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 pt-24 md:pt-32">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Wallet className="text-[#E53945]" size={32} /> TrooBank
            </h1>
            <p className="text-white/50 text-sm mt-1">Your financial command center.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <ShieldCheck size={16} className="text-green-500" />
            <span className="text-xs font-bold text-white/70">Secured by Trooflix</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: BALANCE & ACTIONS */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ELITE BALANCE CARD */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0a] border border-white/10 rounded-3xl p-8 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E53945]/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 blur-[60px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-1">Available Balance</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl md:text-6xl font-black tracking-tighter text-white">
                        {loading ? "..." : Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-lg font-bold text-[#E53945]">TC</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-md">
                    <span className="text-2xl">💳</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <button onClick={() => setShowTopUp(true)} className="flex flex-col items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 py-3.5 rounded-2xl transition group">
                    <ArrowDownRight size={20} className="text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Top Up</span>
                  </button>
                  <button onClick={() => setShowSendModal(true)} className="flex flex-col items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 py-3.5 rounded-2xl transition group">
                    <Send size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Send</span>
                  </button>
                  <button onClick={() => setShowPayoutModal(true)} disabled={Number(balance) < 5} className="flex flex-col items-center justify-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 border border-white/10 py-3.5 rounded-2xl transition group">
                    <ArrowUpRight size={20} className="text-[#E53945] group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Withdraw</span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-white/50" />
                    <span className="text-xs font-medium text-white/70">Payout Method</span>
                  </div>
                  <button onClick={() => setShowDetailsModal(true)} className="text-xs font-bold text-white hover:text-[#E53945] transition flex items-center gap-1">
                    {bankDetails ? (bankDetails.payout_type === "crypto" ? "Crypto Linked" : "Bank Linked") : "Setup"}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: HISTORY */}
          <div className="lg:col-span-5">
            <div className="bg-[#0f0f12] border border-white/5 rounded-3xl overflow-hidden h-full flex flex-col shadow-2xl">
              <div className="flex items-center gap-6 border-b border-white/5 px-6 pt-5">
                <button onClick={() => setActiveTab("history")} className={`pb-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === "history" ? "text-white border-[#E53945]" : "text-white/40 border-transparent hover:text-white/70"}`}>History</button>
                <button onClick={() => setActiveTab("payouts")} className={`pb-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === "payouts" ? "text-white border-[#E53945]" : "text-white/40 border-transparent hover:text-white/70"}`}>Payouts</button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[500px] scrollbar-hide">
                {transactions.filter(t => activeTab === "history" ? true : t.type === "payout").length === 0 ? (
                  <div className="p-10 text-center"><p className="text-white/30 text-sm">No {activeTab} found.</p></div>
                ) : (
                  transactions.filter(t => activeTab === "history" ? true : t.type === "payout").map((t, i) => {
                    const isPayout = t.type === "payout";
                    const isPaid = isPayout && t.status === "completed";
                    const isCancelled = isPayout && t.status === "cancelled";
                    
                    return (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} key={t.id} onClick={() => setSelectedTx(t)} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer transition">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === "topup" ? "bg-green-500/10 text-green-500" : isPayout ? (isPaid ? "bg-green-500/10 text-green-500" : isCancelled ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500") : "bg-red-500/10 text-red-500"}`}>
                            {t.type === "topup" ? <ArrowDownRight size={18} /> : t.type === "send" ? <Send size={16} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm flex items-center gap-2 text-white">
                              {t.type === "topup" ? "Top Up" : t.type === "tip" ? "Tip Sent" : t.type === "send" ? "Sent Coins" : isPayout ? `Payout ${isPaid ? "Paid" : isCancelled ? "Cancelled" : "Pending"}` : "Subscription"}
                            </p>
                            <p className="text-[11px] text-white/40">{new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${t.type === "topup" ? "text-green-500" : isCancelled ? "text-white/30 line-through" : "text-white"}`}>
                          {t.type === "topup" ? "+" : "-"}{Number(t.amount).toFixed(2)}
                        </span>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ELITE MODALS (Top Up, Send, Withdraw, Details, Tx Details) */}
      {/* ... All modals injected here ... */}
      
      <MobileBottomNav />
    </main>
  );
}