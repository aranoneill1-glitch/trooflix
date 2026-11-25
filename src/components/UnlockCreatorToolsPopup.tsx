"use client";

import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";
import Link from "next/link";

export default function UnlockCreatorToolsPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("trooflix:show-unlock-popup") === "1") {
        setOpen(true);
      }
    } catch {}
  }, []);

  const close = () => {
    try { localStorage.removeItem("trooflix:show-unlock-popup"); } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4" onClick={close}>
      <div className="w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} className="absolute top-3 right-3 p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition" aria-label="Close">
          <X size={18} />
        </button>
        <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center mb-4">
          <Lock size={22} className="text-yellow-400" />
        </div>
        <h2 className="text-xl font-black mb-2">Welcome to Trooflix</h2>
        <p className="text-sm text-white/60 mb-6">Unlock Shop, Live, and Premium by buying $5 in coins to tip other users.</p>
        <div className="flex gap-3">
          <Link href="/wallet?topup=true&unlock=creator-tools" onClick={close} className="flex-1 text-center bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3 rounded-xl transition">
            Buy Coins
          </Link>
          <button onClick={close} className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl transition">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
