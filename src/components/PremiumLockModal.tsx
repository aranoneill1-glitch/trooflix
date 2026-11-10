"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, X } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function PremiumLockModal({
  onClose,
  creatorId,
  creatorName,
  priceCents,
  reason = "premium",
}: {
  onClose: () => void;
  creatorId: number;
  creatorName: string;
  priceCents: number | null;
  reason?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) { router.push("/login"); return; }
      const res = await fetch("/api/wallet/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, creatorId, amount: priceCents ? priceCents / 100 : 3.99 }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      if (data.error && data.error.toLowerCase().includes("insufficient")) { if (confirm("You do not have enough TrooCoins. Would you like to top up your wallet?")) { router.push("/wallet?topup=true"); } } else { alert(data.error || "Could not start subscription"); }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const price = priceCents ? (priceCents / 100).toFixed(2) : "3.99";

  return (
    <div className="fixed inset-0 z-[10001] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-gradient-to-b from-[#1c1c1e] to-[#0a0303] border border-white/20 rounded-3xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-white" aria-label="Close">
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
            <Lock size={28} className="text-[#D4AF37]" />
          </div>

          <h2 className="text-2xl font-black mb-2">Premium Content</h2>
          <p className="text-sm text-white/60 mb-6">
            This video is exclusive to subscribers of <span className="text-white font-bold">{creatorName}</span>.
            Subscribe for ${price}/mo to unlock all their premium content.
          </p>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full bg-[#D4AF37] hover:bg-[#b8952b] text-black font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#D4AF37]/30 mb-3 disabled:opacity-50"
          >
            <Sparkles size={16} /> {loading ? "Loading..." : `Subscribe to ${creatorName} — $${price}/mo`}
          </button>

          <button
            onClick={onClose}
            className="block w-full bg-white/5 hover:bg-white/10 text-white/70 font-bold py-3 rounded-xl transition border border-white/10"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
