"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import CreatorStudioNav from "@/components/CreatorStudioNav";
import { Wallet, Plus, ArrowDownRight, ArrowUpRight, ArrowUp, ArrowDown, X, CheckCircle2, Building2, Bitcoin, Send, AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";

export default function WalletPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "tips" | "subs" | "withdrawals">("all");
  
  // Modals
  const [showTopUp, setShowTopUp] = useState(false);
  useEffect(() => { if (typeof window !== "undefined" && window.location.search.includes("topup=true")) { setShowTopUp(true); window.history.replaceState({}, "", "/wallet"); } }, []);
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
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 pt-[76px]">
        
        {/* NEW LAYOUT */}
    <CreatorStudioNav active="bank" className="mb-8" />

    <div className="mb-12 flex flex-col items-center text-center">
      <p className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">Available Balance</p>
      <div className="flex items-baseline gap-2 mb-8">
        <span className="text-6xl md:text-8xl font-black tracking-tighter text-white">
          {loading ? "..." : Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-2xl font-bold text-[#E53945]">TC</span>
      </div>

      <div className="flex items-center justify-center gap-6 mb-10">
        <button onClick={() => setShowTopUp(true)} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center transition group cursor-pointer">
          <Plus size={24} className="text-green-400 group-hover:scale-110 transition-transform mb-1" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Top Up</span>
        </button>
        <button onClick={() => setShowSendModal(true)} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center transition group cursor-pointer">
          <Send size={20} className="text-blue-400 group-hover:scale-110 transition-transform mb-1" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Send</span>
        </button>
        <button onClick={() => setShowPayoutModal(true)} disabled={Number(balance) < 5} className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 flex flex-col items-center justify-center transition group cursor-pointer">
          <ArrowUpRight size={22} className="text-[#E53945] group-hover:scale-110 transition-transform mb-1" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Withdraw</span>
        </button>
      </div>

      <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-full px-6 py-3 w-full max-w-sm">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-white/50" />
          <span className="text-xs font-medium text-white/70">Payout Method</span>
        </div>
        <button onClick={() => setShowDetailsModal(true)} className="text-xs font-bold text-white hover:text-[#E53945] transition flex items-center gap-1 cursor-pointer">
          {bankDetails ? (bankDetails.payout_type === "crypto" ? "Crypto Linked" : "Bank Linked") : "Setup"}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>

    <div className="w-full">
      <div className="flex items-center justify-center gap-8 border-b border-white/5 mb-2 overflow-x-auto scrollbar-hide">
        {(["all", "tips", "subs", "withdrawals"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 cursor-pointer ${activeTab === tab ? "text-white border-[#E53945]" : "text-white/40 border-transparent hover:text-white/70"}`}>
            {tab === "subs" ? "Subs" : tab}
          </button>
        ))}
      </div>

      <div className="w-full">
        {transactions.filter(t => {
          if (activeTab === "all") return true;
          if (activeTab === "tips") return t.type === "tip";
          if (activeTab === "subs") return t.type === "subscription";
          if (activeTab === "withdrawals") return t.type === "payout";
          return true;
        }).length === 0 ? (
          <div className="py-20 text-center"><p className="text-white/30 text-sm">No {activeTab} transactions found.</p></div>
        ) : (
          transactions.filter(t => {
            if (activeTab === "all") return true;
            if (activeTab === "tips") return t.type === "tip";
            if (activeTab === "subs") return t.type === "subscription";
            if (activeTab === "withdrawals") return t.type === "payout";
            return true;
          }).map((t, i) => {
            const isPayout = t.type === "payout";
            const isPaid = isPayout && t.status === "completed";
            const isCancelled = isPayout && t.status === "cancelled";
            const isIncoming = t.type === "topup" || (t.sender_id !== userId && t.receiver_id === userId);
            const avatarUrl = isIncoming ? t.sender_avatar : t.receiver_avatar;
            const showAvatar = (t.type === "tip" || t.type === "subscription") && avatarUrl;

            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} key={t.id} onClick={() => setSelectedTx(t)} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer transition">
                <div className="flex items-center gap-4">
                  {showAvatar ? (
                    <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncoming ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {t.type === "topup" ? <Plus size={18} /> : isIncoming ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm flex items-center gap-2 text-white">
                      {t.type === "topup" ? "Top Up" : t.type === "tip" ? (t.sender_id === userId ? "Tip sent to @" + (t.receiver_name || "user") : "Tip received from @" + (t.sender_name || "user")) : t.type === "send" ? "Sent Coins" : isPayout ? `Withdrawal ${isPaid ? "Paid" : isCancelled ? "Cancelled" : "Pending"}` : t.type === "subscription" ? (t.sender_id === userId ? "Subscribed to @" + (t.receiver_name || "creator") : "Subscription from @" + (t.sender_name || "user")) : "Transaction"}
                    </p>
                    <p className="text-[11px] text-white/40">{new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${isIncoming ? "text-green-500" : isCancelled ? "text-white/30 line-through" : "text-red-400"}`}>
                  {isIncoming ? "+" : "-"}{Number(t.amount).toFixed(2)}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  </div>

  {/* TRANSACTION DETAIL MODAL */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedTx(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0f0f12] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h2 className="text-lg font-black text-white">Transaction Receipt</h2>
                <button onClick={() => setSelectedTx(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={16} /></button>
              </div>
              <div className="p-6">
                <div className="flex flex-col gap-1.5 mb-6">
                  <p className="text-[10px] font-mono font-bold text-white/60 bg-white/10 px-2 py-1 rounded-md w-fit tracking-widest">
                    TRX-{selectedTx.id ? selectedTx.id.split("-")[0].toUpperCase() : "N/A"}
                  </p>
                  <p className="text-xs text-white/50">{new Date(selectedTx.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/5 mb-4">
                  <span className="text-sm text-white/50">Amount</span>
                  <span className="font-black text-2xl text-white">${Number(selectedTx.amount).toFixed(2)}</span>
                </div>
                
                {selectedTx.type === "payout" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-white/50">Status</span>
                      <span className={`font-bold text-xs uppercase px-2 py-1 rounded ${selectedTx.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : selectedTx.status === "completed" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>{selectedTx.status}</span>
                    </div>
                    {selectedTx.fee > 0 && (
                      <div className="flex justify-between items-center py-2 border-t border-white/5">
                        <span className="text-sm text-white/50">Fee (15%)</span>
                        <span className="font-bold text-sm text-red-400">-${Number(selectedTx.fee).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="bg-black/40 border border-white/5 p-4 rounded-xl mt-2">
                      <p className="text-xs font-bold text-white/50 mb-2 uppercase tracking-wide">Destination Details</p>
                      {bankDetails?.payout_type === "crypto" ? (
                        <div className="text-xs font-mono text-white/80 break-all">
                          <p className="text-yellow-500 mb-1">{bankDetails.crypto_network}</p>
                          {bankDetails.crypto_address}
                        </div>
                      ) : (
                        <div className="text-xs text-white/80 space-y-1">
                          <p><strong className="text-white/50">Name:</strong> {bankDetails?.account_name}</p>
                          <p><strong className="text-white/50">Bank:</strong> {bankDetails?.bank_name}</p>
                          {bankDetails?.account_number && <p><strong className="text-white/50">Acc:</strong> {bankDetails.account_number}</p>}
                          {bankDetails?.iban && <p><strong className="text-white/50">IBAN:</strong> {bankDetails.iban}</p>}
                        </div>
                      )}
                    </div>
                    {selectedTx.status === "pending" && (
                      <button onClick={() => cancelPayout(selectedTx.id)} className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl transition text-sm border border-red-500/20">
                        Cancel Payout
                      </button>
                    )}
                  </div>
                )}

                {selectedTx.type === "tip" && (
                  <div className="bg-black/40 border border-white/5 p-4 rounded-xl mt-2">
                    {!selectedTx.video_id ? (
                      <p className="text-xs text-white/50">Video details not available.</p>
                    ) : videoCache[selectedTx.video_id] ? (
                      <div className="flex gap-3 items-center">
                        <img src={videoCache[selectedTx.video_id].posterUrl} className="w-12 h-16 object-cover rounded" />
                        <div>
                          <p className="text-[10px] text-white/50 mb-1 uppercase tracking-wide">Tipped on video</p>
                          <p className="text-sm font-bold text-white line-clamp-2">{videoCache[selectedTx.video_id].title}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-white/50">Loading video details...</p>
                    )}
                  </div>
                )}

                {selectedTx.type === "send" && (
                  <div className="bg-black/40 border border-white/5 p-4 rounded-xl mt-2">
                    <p className="text-xs font-bold text-white/50 mb-1">Recipient</p>
                    <p className="text-sm font-bold text-white">@{selectedTx.description.replace("Sent to @", "")}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP UP MODAL */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowTopUp(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0f0f12] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h2 className="text-lg font-black text-white">Top Up Coins</h2>
                <button onClick={() => setShowTopUp(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={16} /></button>
              </div>
              <div className="p-6">
                <p className="text-xs text-white/50 mb-4">1 TC = $1.00 USD</p>
                <div className="space-y-2 mb-6">
                  {[{c: 5, p: 500}, {c: 10, p: 1000}, {c: 25, p: 2500}, {c: 50, p: 5000}].map(pkg => (
                    <button key={pkg.c} disabled={buying} onClick={() => buyCoins(pkg.c, pkg.p)} className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/5 hover:border-[#E53945]/50 hover:bg-[#E53945]/5 transition group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-black">C</div>
                        <div className="text-left"><p className="font-bold text-sm text-white">{pkg.c} Coins</p><p className="text-xs text-white/40">${(pkg.p / 100).toFixed(2)}</p></div>
                      </div>
                      <span className="text-[#E53945] font-bold text-xs opacity-0 group-hover:opacity-100 transition">Buy</span>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-white/5 mb-4"></div>
                <div className="flex gap-2">
                  <input type="number" min="5" max="500" step="0.01" placeholder="Custom Amount ($)" value={customTopUp} onChange={e => setCustomTopUp(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E53945]" />
                  <button onClick={() => buyCoins(Number(customTopUp), Number(customTopUp) * 100)} disabled={!customTopUp || Number(customTopUp) < 5 || Number(customTopUp) > 500} className="bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-5 rounded-xl transition disabled:opacity-50 text-sm">Buy</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEND MODAL */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowSendModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0f0f12] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h2 className="text-lg font-black text-white">Send Coins</h2>
                <button onClick={() => setShowSendModal(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={16} /></button>
              </div>
              <div className="p-6">
                {sendStatus === "success" ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold mb-1">Sent!</h4>
                    <p className="text-sm text-white/50">Coins transferred successfully.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-4">
                      <label className="text-[11px] font-bold text-white/50 mb-1.5 block uppercase tracking-wider">Recipient</label>
                      <input type="text" value={sendUsername} onChange={e => setSendUsername(e.target.value)} placeholder="@username" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E53945]" />
                      {sendUsername.length >= 2 && (sendSearchResults.length > 0 || searchingUsers) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[300] max-h-40 overflow-y-auto">
                          {searchingUsers ? (
                            <div className="p-3 text-center text-xs text-white/50">Searching...</div>
                          ) : (
                            sendSearchResults.map(u => (
                              <button key={u.user_id} onClick={() => { setSendUsername(u.username); setSendSearchResults([]); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition text-left border-b border-white/5 last:border-0">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{(u.display_name || u.username)?.[0]?.toUpperCase()}</div>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-white leading-tight">{u.display_name || u.username}</p>
                                  <p className="text-[10px] text-white/50">@{u.username}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <label className="text-[11px] font-bold text-white/50 mb-1.5 block uppercase tracking-wider">Amount (TC)</label>
                    <input type="number" min="1" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="e.g. 5" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E53945] mb-4" />
                    {sendStatus === "error" && <p className="text-red-400 text-xs mb-4">{sendError}</p>}
                    <button onClick={submitSend} disabled={!sendUsername || !sendAmount || sendStatus === "loading"} className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition">
                      {sendStatus === "loading" ? "Sending..." : "Send Coins"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WITHDRAW MODAL */}
      <AnimatePresence>
        {showPayoutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowPayoutModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0f0f12] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h2 className="text-lg font-black text-white">Withdraw</h2>
                <button onClick={() => setShowPayoutModal(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={16} /></button>
              </div>
              <div className="p-6">
                {payoutStatus === "success" ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold mb-1">Request Sent!</h4>
                    <p className="text-sm text-white/50">The admin will process your payment shortly.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-white/50 mb-4">Minimum $5.00</p>
                    <label className="text-[11px] font-bold text-white/50 mb-1.5 block uppercase tracking-wider">Amount ($)</label>
                    <input type="number" step="1" min="5" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="e.g. 50" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E53945] mb-4" />
                    
                    <label className="text-[11px] font-bold text-white/50 mb-1.5 block uppercase tracking-wider">Method</label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button onClick={() => setPayoutMethod("bank")} className={`py-2.5 rounded-lg font-bold text-xs border transition ${payoutMethod === "bank" ? "bg-[#E53945]/10 border-[#E53945] text-white" : "bg-white/5 border-white/10 text-white/50"}`}>Bank (0% Fee)</button>
                      <button onClick={() => setPayoutMethod("crypto")} className={`py-2.5 rounded-lg font-bold text-xs border transition ${payoutMethod === "crypto" ? "bg-yellow-500/10 border-yellow-500 text-yellow-400" : "bg-white/5 border-white/10 text-white/50"}`}>Crypto (15% Fee)</button>
                    </div>

                    {payoutMethod === "crypto" && payoutAmount && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
                        <div className="flex justify-between text-xs text-yellow-500/80 mb-1"><span>Requested:</span><span>${Number(payoutAmount || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs text-yellow-500/80 mb-1"><span>Fee (15%):</span><span>-${(Number(payoutAmount || 0) * 0.15).toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm font-bold text-yellow-400 pt-2 border-t border-yellow-500/20 mt-2"><span>You Receive:</span><span>${(Number(payoutAmount || 0) * 0.85).toFixed(2)}</span></div>
                      </div>
                    )}

                    {payoutStatus === "error" && <p className="text-red-400 text-xs mb-4">{payoutError}</p>}
                    
                    <button onClick={submitPayout} disabled={!payoutAmount || payoutStatus === "loading"} className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition">
                      {payoutStatus === "loading" ? "Requesting..." : "Request Payout"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILS SETTINGS MODAL */}
      <AnimatePresence>
        {showDetailsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0f0f12] border border-white/10 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#0f0f12] z-10">
                <h2 className="text-lg font-black text-white">Payout Settings</h2>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={16} /></button>
              </div>
              <div className="p-6">
                {detailsStatus === "success" ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold mb-1">Saved!</h4>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4 bg-black/40 p-1 rounded-xl">
                      <button onClick={() => setDetailsType("bank")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${detailsType === "bank" ? "bg-white/10 text-white" : "text-white/40"}`}>Bank Transfer</button>
                      <button onClick={() => setDetailsType("crypto")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${detailsType === "crypto" ? "bg-white/10 text-white" : "text-white/40"}`}>Crypto</button>
                    </div>

                    {detailsType === "bank" ? (
                      <div className="space-y-3">
                        <input type="text" value={form.accountName} onChange={e => setForm({...form, accountName: e.target.value})} placeholder="Account Holder Name" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                        <input type="text" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} placeholder="Bank Name" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                        <input type="text" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} placeholder="Account Number (US/UK)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                        <input type="text" value={form.sortCode} onChange={e => setForm({...form, sortCode: e.target.value})} placeholder="Sort Code / Routing Number" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                        <div className="h-px bg-white/10 my-2"></div>
                        <input type="text" value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} placeholder="IBAN (Europe)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                        <input type="text" value={form.swiftBic} onChange={e => setForm({...form, swiftBic: e.target.value})} placeholder="SWIFT / BIC Code (International)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <select value={form.cryptoNetwork} onChange={e => setForm({...form, cryptoNetwork: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-yellow-500 appearance-none">
                          <option value="USDT (TRC20)">USDT (TRC20)</option>
                          <option value="USDT (ERC20)">USDT (ERC20)</option>
                          <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                          <option value="Ethereum (ETH)">Ethereum (ETH)</option>
                        </select>
                        <input type="text" value={form.cryptoAddress} onChange={e => setForm({...form, cryptoAddress: e.target.value})} placeholder="Wallet Address" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-yellow-500" />
                        <p className="text-[10px] text-yellow-500/70 mt-1">Note: A 15% fee is deducted from crypto payouts.</p>
                      </div>
                    )}

                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 items-start mb-4 mt-6">
                      <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-red-400 leading-tight">
                        <strong>WARNING:</strong> Please double-check all details. Once a payout is processed, it <strong>cannot be reversed or refunded</strong>.
                      </p>
                    </div>

                    <button onClick={saveDetails} disabled={detailsStatus === "loading" || (detailsType === "bank" && (!form.accountName || !form.bankName)) || (detailsType === "crypto" && !form.cryptoAddress)} className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition">
                      {detailsStatus === "loading" ? "Saving..." : "Save Details"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileBottomNav />
    </main>
  );
}
