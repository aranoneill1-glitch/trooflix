"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Wallet, ArrowDownRight, ArrowUpRight, X, CheckCircle2, Building2, Bitcoin, Send, Play, AlertTriangle } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

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

  // Fetch video details for tips
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
    } catch (e) {
      alert("Network error.");
    }
  };

  const submitSend = async () => {
    setSendStatus("loading");
    setSendError("");
    try {
      const res = await fetch("/api/wallet/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderId: userId, recipientUsername: sendUsername, amount: Number(sendAmount) }) });
      const d = await res.json();
      if (res.ok) { 
        setSendStatus("success"); 
        fetchWallet(); 
        setTimeout(() => { setShowSendModal(false); setSendStatus("idle"); setSendUsername(""); setSendAmount(""); }, 2000); 
      } else { 
        setSendStatus("error"); 
        setSendError(d.error || "Transfer failed."); 
      }
    } catch (e) {
      setSendStatus("error"); 
      setSendError("Network error.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-24">
        
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#1c1c1e] to-[#0a0303] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl mb-8">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Wallet size={24} className="text-[#E53945]" /></div>
              <div><h1 className="text-2xl font-black">My Wallet</h1><p className="text-sm text-white/50">TrooBank</p></div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-white/50">Available Balance</p>
              <span className="text-[10px] bg-[#E53945]/20 text-[#E53945] px-2 py-0.5 rounded-full font-bold">1 Coin = $1.00 USD</span>
            </div>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-black">{loading ? "..." : Number(balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              <span className="text-lg text-white/50 font-bold">TrooCoins</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowTopUp(true)} className="flex-1 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">Top Up</button>
              <button onClick={() => setShowSendModal(true)} className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"><Send size={16} /> Send</button>
            </div>
          </div>
        </div>

        {/* Payout Method Card */}
        <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Payout Method</h2>
              <p className="text-xs text-white/50">Where we send your earnings.</p>
            </div>
            <button onClick={() => setShowDetailsModal(true)} className="text-sm font-bold text-[#E53945] hover:text-[#d12e39] transition">Edit</button>
          </div>
          {!bankDetails ? (
            <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-sm text-white/50 mb-3">No payout method saved yet.</p>
              <button onClick={() => setShowDetailsModal(true)} className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition">Add Details</button>
            </div>
          ) : (
            <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center justify-between">
              {bankDetails.payout_type === "crypto" ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500"><Bitcoin size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-0.5">{bankDetails.crypto_network} (15% Fee)</p>
                    <p className="font-mono text-sm text-white/80 break-all">{bankDetails.crypto_address.slice(0, 10)}...{bankDetails.crypto_address.slice(-6)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Building2 size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">Bank Transfer</p>
                    <p className="text-sm font-bold text-white/90">{bankDetails.account_name}</p>
                    <p className="text-xs text-white/50">{bankDetails.bank_name} •••• {bankDetails.account_number?.slice(-4) || bankDetails.iban?.slice(-4)}</p>
                  </div>
                </div>
              )}
              <button onClick={() => setShowPayoutModal(true)} disabled={Number(balance) < 5} className="bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">Withdraw</button>
            </div>
          )}
        </div>

        {/* History Tabs */}
        <div className="flex items-center gap-6 border-b border-white/10 mb-6">
          <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold transition-colors ${activeTab === "history" ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>History</button>
          <button onClick={() => setActiveTab("payouts")} className={`pb-3 text-sm font-bold transition-colors ${activeTab === "payouts" ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>Payouts</button>
        </div>

        {transactions.filter(t => activeTab === "history" ? true : t.type === "payout").length === 0 ? (
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-8 text-center"><p className="text-white/40">No {activeTab} found.</p></div>
        ) : (
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
            {transactions.filter(t => activeTab === "history" ? true : t.type === "payout").map(t => {
              const isPayout = t.type === "payout";
              const isPaid = isPayout && t.status === "completed";
              const isCancelled = isPayout && t.status === "cancelled";
              
              return (
                <div key={t.id} onClick={() => setSelectedTx(t)} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === "topup" ? "bg-green-500/20 text-green-500" : isPayout ? (isPaid ? "bg-green-500/20 text-green-500" : isCancelled ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500") : "bg-red-500/20 text-red-500"}`}>
                      {t.type === "topup" ? <ArrowDownRight size={18} /> : t.type === "send" ? <Send size={16} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {t.type === "topup" ? "Top Up" : t.type === "tip" ? "Tip Sent" : t.type === "send" ? "Sent Coins" : isPayout ? `Payout ${isPaid ? "Paid" : isCancelled ? "Cancelled" : "Pending"}` : "Subscription"}
                        {isPayout && <span className="text-[9px] font-mono bg-white/5 text-white/40 px-1.5 py-0.5 rounded">PAY-{t.id.split("-")[0].toUpperCase()}</span>}
                      </p>
                      <p className="text-xs text-white/50">{new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
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

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTx(null)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedTx(null)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
            <h2 className="text-xl font-black mb-1">Transaction Details</h2>
            <p className="text-xs text-white/50 mb-6">{new Date(selectedTx.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-white/50">Amount</span>
                <span className="font-bold text-lg">${Number(selectedTx.amount).toFixed(2)}</span>
              </div>
              
              {selectedTx.type === "payout" && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-white/50">Status</span>
                    <span className={`font-bold text-sm ${selectedTx.status === "pending" ? "text-yellow-500" : selectedTx.status === "completed" ? "text-green-500" : "text-red-500"}`}>{selectedTx.status.toUpperCase()}</span>
                  </div>
                  {selectedTx.fee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-white/50">Fee (15%)</span>
                      <span className="font-bold text-sm text-red-400">-${Number(selectedTx.fee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="bg-white/5 p-3 rounded-xl">
                    <p className="text-xs font-bold text-white/50 mb-2">Sent To:</p>
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
                    <button onClick={() => cancelPayout(selectedTx.id)} className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl transition text-sm">
                      Cancel Payout Request
                    </button>
                  )}
                </>
              )}

              {selectedTx.type === "tip" && (
                <>
                  {!selectedTx.video_id ? (
                    <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3">
                      <p className="text-xs text-white/50">Video details not available for this older tip.</p>
                    </div>
                  ) : videoCache[selectedTx.video_id] ? (
                    <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3">
                      <img src={videoCache[selectedTx.video_id].posterUrl} className="w-12 h-16 object-cover rounded" />
                      <div>
                        <p className="text-xs text-white/50 mb-1">Tipped on video</p>
                        <p className="text-sm font-bold text-white line-clamp-2">{videoCache[selectedTx.video_id].title}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3">
                      <p className="text-xs text-white/50">Video not found or deleted.</p>
                    </div>
                  )}
                </>
              )}

              {selectedTx.type === "send" && (
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs font-bold text-white/50 mb-1">Sent To:</p>
                  <p className="text-sm font-bold text-white">@{selectedTx.description.replace("Sent to @", "")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTopUp(false)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowTopUp(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
            <h2 className="text-2xl font-black mb-1">Top Up</h2>
            <p className="text-sm text-white/50 mb-6">1 Coin = $1.00</p>
            <div className="space-y-3 mb-4">
              {[{c: 5, p: 500}, {c: 10, p: 1000}, {c: 25, p: 2500}, {c: 50, p: 5000}].map(pkg => (
                <button key={pkg.c} disabled={buying} onClick={() => buyCoins(pkg.c, pkg.p)} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-[#E53945] hover:bg-[#E53945]/10 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black">C</div>
                    <div className="text-left"><p className="font-bold">{pkg.c} Coin{pkg.c !== 1 ? "s" : ""}</p><p className="text-xs text-white/50">${(pkg.p / 100).toFixed(2)}</p></div>
                  </div>
                  <span className="text-[#E53945] font-bold text-sm opacity-0 group-hover:opacity-100 transition">Buy</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="number" min="5" placeholder="Custom Amount ($)" value={customTopUp} onChange={e => setCustomTopUp(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
              <button onClick={() => buyCoins(Number(customTopUp), Number(customTopUp) * 100)} disabled={!customTopUp || Number(customTopUp) < 5} className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 rounded-xl transition disabled:opacity-50 text-sm">Buy</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSendModal(false)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSendModal(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
            <h2 className="text-2xl font-black mb-1">Send Coins</h2>
            <p className="text-sm text-white/50 mb-6">Send TrooCoins to another user.</p>
            
            {sendStatus === "success" ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold mb-1">Sent!</h4>
                <p className="text-sm text-white/50">Coins successfully transferred.</p>
              </div>
            ) : (
              <>
                <div className="relative mb-4">
                  <label className="text-xs font-bold text-white/50 mb-2 block">Recipient Username</label>
                  <input type="text" value={sendUsername} onChange={e => setSendUsername(e.target.value)} placeholder="@username" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945]" />
                  
                  {/* Autocomplete Dropdown */}
                  {sendUsername.length >= 2 && (sendSearchResults.length > 0 || searchingUsers) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[300] max-h-48 overflow-y-auto">
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
                              <p className="text-xs text-white/50">@{u.username}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                <label className="text-xs font-bold text-white/50 mb-2 block">Amount ($)</label>
                <input type="number" min="1" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="e.g. 5" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] mb-4" />
                
                {sendStatus === "error" && <p className="text-red-400 text-sm mb-4">{sendError}</p>}
                
                <button onClick={submitSend} disabled={!sendUsername || !sendAmount || sendStatus === "loading"} className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition">
                  {sendStatus === "loading" ? "Sending..." : "Send Coins"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Withdraw & Payout Settings Modals (Same as before) */}
      {/* ... */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPayoutModal(false)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPayoutModal(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
            <h2 className="text-2xl font-black mb-1">Withdraw</h2>
            <p className="text-sm text-white/50 mb-6">Minimum $5.00</p>
            
            {payoutStatus === "success" ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold mb-1">Request Sent!</h4>
                <p className="text-sm text-white/50">The admin will process your payment shortly.</p>
              </div>
            ) : (
              <>
                <label className="text-xs font-bold text-white/50 mb-2 block">Amount ($)</label>
                <input type="number" step="1" min="5" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="e.g. 50" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] mb-4" />
                
                <label className="text-xs font-bold text-white/50 mb-2 block">Method</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => setPayoutMethod("bank")} className={`py-2.5 rounded-lg font-bold text-xs border ${payoutMethod === "bank" ? "bg-[#E53945]/20 border-[#E53945] text-white" : "bg-white/5 border-white/10 text-white/50"}`}>Bank (0% Fee)</button>
                  <button onClick={() => setPayoutMethod("crypto")} className={`py-2.5 rounded-lg font-bold text-xs border ${payoutMethod === "crypto" ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" : "bg-white/5 border-white/10 text-white/50"}`}>Crypto (15% Fee)</button>
                </div>

                {payoutMethod === "crypto" && payoutAmount && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                    <div className="flex justify-between text-xs text-yellow-500/80 mb-1"><span>Requested:</span><span>${Number(payoutAmount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs text-yellow-500/80 mb-1"><span>Fee (15%):</span><span>-${(Number(payoutAmount || 0) * 0.15).toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm font-bold text-yellow-400 pt-1 border-t border-yellow-500/20 mt-1"><span>You Receive:</span><span>${(Number(payoutAmount || 0) * 0.85).toFixed(2)}</span></div>
                  </div>
                )}

                {payoutStatus === "error" && <p className="text-red-400 text-sm mb-4">{payoutError}</p>}
                
                <button onClick={submitPayout} disabled={!payoutAmount || payoutStatus === "loading"} className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition">
                  {payoutStatus === "loading" ? "Requesting..." : "Request Payout"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
            <h2 className="text-2xl font-black mb-1">Payout Settings</h2>
            <p className="text-sm text-white/50 mb-6">Where should we send your money?</p>
            
            {detailsStatus === "success" ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold mb-1">Saved!</h4>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4 bg-black/40 p-1 rounded-xl">
                  <button onClick={() => setDetailsType("bank")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${detailsType === "bank" ? "bg-white/10 text-white" : "text-white/50"}`}>Bank Transfer</button>
                  <button onClick={() => setDetailsType("crypto")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${detailsType === "crypto" ? "bg-white/10 text-white" : "text-white/50"}`}>Crypto</button>
                </div>

                {detailsType === "bank" ? (
                  <div className="space-y-3">
                    <input type="text" value={form.accountName} onChange={e => setForm({...form, accountName: e.target.value})} placeholder="Account Holder Name" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                    <input type="text" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} placeholder="Bank Name" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                    <input type="text" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} placeholder="Account Number (US/UK)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                    <input type="text" value={form.sortCode} onChange={e => setForm({...form, sortCode: e.target.value})} placeholder="Sort Code / Routing Number" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]" />
                    <div className="h-px bg-white/10 my-1"></div>
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
                    <p className="text-[10px] text-yellow-500/70 mt-1">Note: A 15% fee is deducted from crypto payouts to cover network fees.</p>
                  </div>
                )}

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 items-start mb-4 mt-4">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-red-400 leading-tight">
                    <strong>WARNING:</strong> Please double-check all your payout details. Once a payout is processed, it is sent to the destination on file and <strong>cannot be reversed or refunded</strong>.
                  </p>
                </div>

                <button onClick={saveDetails} disabled={detailsStatus === "loading" || (detailsType === "bank" && (!form.accountName || !form.bankName)) || (detailsType === "crypto" && !form.cryptoAddress)} className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition">
                  {detailsStatus === "loading" ? "Saving..." : "Save Details"}
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