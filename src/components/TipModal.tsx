"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Sparkles, Loader2 } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

const GoldCoin = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18" fill="url(#gold-coin-grad)" stroke="#FFF3B0" strokeWidth="1.5" />
    <circle cx="20" cy="20" r="14" fill="none" stroke="#9A7B1C" strokeWidth="1.5" strokeDasharray="2 2" />
    <text x="20" y="25" textAnchor="middle" fill="#584100" fontSize="16" fontWeight="900" fontFamily="sans-serif">$</text>
    <defs>
      <radialGradient id="gold-coin-grad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF2A3" />
        <stop offset="45%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8F6B12" />
      </radialGradient>
    </defs>
  </svg>
);

const COIN_BURST = [
  { x: -100, y: -160, r: -220, delay: 0.0 },
  { x: -65, y: -210, r: 260, delay: 0.04 },
  { x: -30, y: -240, r: -110, delay: 0.08 },
  { x: 15, y: -230, r: 180, delay: 0.02 },
  { x: 60, y: -205, r: -340, delay: 0.06 },
  { x: 105, y: -155, r: 240, delay: 0.11 },
  { x: -80, y: -130, r: 140, delay: 0.14 },
  { x: -45, y: -180, r: -290, delay: 0.09 },
  { x: 0, y: -250, r: -420, delay: 0.03 },
  { x: 40, y: -175, r: 190, delay: 0.13 },
  { x: 80, y: -135, r: -160, delay: 0.05 },
  { x: -15, y: -195, r: 310, delay: 0.16 },
];

export default function TipModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [sentAmount, setSentAmount] = useState<number>(0);

  useEffect(() => {
    const handleOpen = (e: any) => {
      const cid = e.detail?.creatorId;
      if (!cid) return;
      setCreatorId(cid);
      setIsOpen(true);
      setStatus("idle");
      setErrorMsg("");
      setCustomAmount("");
      setSentAmount(0);
    };
    window.addEventListener("open-tip-modal", handleOpen);
    return () => window.removeEventListener("open-tip-modal", handleOpen);
  }, []);

  const sendTip = async (amount: number) => {
    setStatus("loading");
    setErrorMsg("");
    setSentAmount(amount);
    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Please log in to send a tip.");
      
      const res = await fetch("/api/wallet/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user.id, receiverId: creatorId, amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tip failed");
      
      setStatus("success");
      window.dispatchEvent(new Event("tip-sent"));
      setTimeout(() => setIsOpen(false), 2600);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  const handleCustomTip = () => {
    const val = parseFloat(customAmount);
    if (isNaN(val) || val < 0.5) return setErrorMsg("Minimum tip is $0.50");
    if ((val * 2) % 1 !== 0) return setErrorMsg("Amount must be a multiple of $0.50");
    sendTip(val);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-md" onClick={() => status !== "loading" && setIsOpen(false)} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 z-[401] bg-[#141416]/95 border-t border-white/10 rounded-t-3xl p-6 pb-12 lg:max-w-sm lg:mx-auto lg:rounded-3xl lg:bottom-10 shadow-2xl backdrop-blur-2xl overflow-visible">
            
            {status === "success" ? (
              <div className="relative py-10 flex flex-col items-center justify-center text-center">
                {/* 3D Animated Gold Coins Fountain */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {COIN_BURST.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 20, x: 0, scale: 0, opacity: 0 }}
                      animate={{
                        y: [20, c.y, c.y + 40],
                        x: [0, c.x * 0.7, c.x],
                        scale: [0, 1.2, 0.9],
                        opacity: [0, 1, 1, 0],
                        rotate: c.r,
                        rotateY: [0, 360, 720],
                      }}
                      transition={{ duration: 1.6, delay: c.delay, ease: "easeOut" }}
                      className="absolute drop-shadow-[0_4px_12px_rgba(212,175,55,0.7)]"
                    >
                      <GoldCoin size={30} />
                    </motion.div>
                  ))}

                  {/* Sparkle particles */}
                  {[-40, 0, 45].map((off, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0, opacity: 0, y: 0 }}
                      animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0], y: -120 + off }}
                      transition={{ duration: 1.2, delay: 0.15 * idx, ease: "easeOut" }}
                      className="absolute text-yellow-300"
                    >
                      <Sparkles size={24} />
                    </motion.div>
                  ))}
                </div>

                {/* Big Center Golden Badge */}
                <motion.div 
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 260 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#8F6B12] via-[#D4AF37] to-[#FFF3B0] p-1 shadow-[0_0_50px_rgba(212,175,55,0.7)] flex items-center justify-center mb-4"
                >
                  <div className="w-full h-full rounded-full bg-[#18150c] flex items-center justify-center border-2 border-[#FFE885]/60">
                    <span className="text-2xl font-black text-[#FFE885] tracking-tight">
                      ${sentAmount.toFixed(2)}
                    </span>
                  </div>
                </motion.div>

                <motion.h4 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-black bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent mb-1.5 tracking-tight drop-shadow"
                >
                  Tip Sent!
                </motion.h4>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-white/70 max-w-[240px]"
                >
                  Your coin support has landed directly in the creator's wallet.
                </motion.p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black flex items-center gap-2"><Gift className="text-[#D4AF37]" /> Send a Tip</h3>
                  <button onClick={() => status !== "loading" && setIsOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
                </div>

                <p className="text-sm text-white/50 mb-6">1 Coin = $1.00. Your support goes directly to the creator.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[0.5, 1, 2.5, 5].map(amt => (
                    <button key={amt} disabled={status === "loading"} onClick={() => sendTip(amt)} className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition group disabled:opacity-50">
                      <span className="text-2xl font-black text-white group-hover:text-[#D4AF37]">${amt.toFixed(2)}</span>
                      <span className="text-xs text-white/50 group-hover:text-[#D4AF37]/70">Tip</span>
                    </button>
                  ))}
                </div>
                
                <div className="mb-4">
                  <label className="text-xs font-bold text-white/50 mb-2 block">Custom Amount ($)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      step="0.5" 
                      min="0.5" 
                      value={customAmount} 
                      onChange={e => setCustomAmount(e.target.value)} 
                      placeholder="e.g. 1.50"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
                    />
                    <button 
                      onClick={handleCustomTip}
                      disabled={status === "loading" || !customAmount}
                      className="bg-[#D4AF37] hover:bg-[#b8952b] disabled:opacity-50 text-black font-bold px-6 rounded-xl transition"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {status === "loading" && <p className="text-center text-sm text-white/50 flex justify-center items-center gap-2"><Loader2 size={14} className="animate-spin" /> Processing...</p>}
                {status === "error" && <p className="text-center text-sm text-red-400 mt-2">{errorMsg}</p>}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
