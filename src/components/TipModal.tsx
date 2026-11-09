"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, CheckCircle2, Loader2 } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function TipModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleOpen = (e: any) => {
      const cid = e.detail?.creatorId;
      if (!cid) return;
      setCreatorId(cid);
      setIsOpen(true);
      setStatus("idle");
      setErrorMsg("");
    };
    window.addEventListener("open-tip-modal", handleOpen);
    return () => window.removeEventListener("open-tip-modal", handleOpen);
  }, []);

  const sendTip = async (amount: number) => {
    setStatus("loading");
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
      setTimeout(() => setIsOpen(false), 2000);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm" onClick={() => status !== "loading" && setIsOpen(false)} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 z-[401] bg-[#1c1c1e] border-t border-white/10 rounded-t-3xl p-6 pb-12 lg:max-w-sm lg:mx-auto lg:rounded-3xl lg:bottom-10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black flex items-center gap-2"><Gift className="text-[#D4AF37]" /> Send a Tip</h3>
              <button onClick={() => status !== "loading" && setIsOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={18} /></button>
            </div>

            {status === "success" ? (
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold mb-1">Tip Sent!</h4>
                <p className="text-sm text-white/50">The creator thanks you for the support.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/50 mb-6">1 Coin = $1.00. Your support goes directly to the creator.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[5, 10, 25, 50].map(amt => (
                    <button key={amt} disabled={status === "loading"} onClick={() => sendTip(amt)} className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition group disabled:opacity-50">
                      <span className="text-2xl font-black text-white group-hover:text-[#D4AF37]">{amt}</span>
                      <span className="text-xs text-white/50 group-hover:text-[#D4AF37]/70">Coins</span>
                    </button>
                  ))}
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