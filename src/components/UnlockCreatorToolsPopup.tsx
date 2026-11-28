"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, ShoppingBag, Radio, Crown, Coins } from "lucide-react";
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={close}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/15 bg-[#121214]/95 shadow-[0_30px_100px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full bg-[#E53945]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="relative px-6 pt-8 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E53945]/30 bg-[#E53945]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff8a93] mb-5">
            <Sparkles size={13} />
            Welcome to Trooflix
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white leading-[1.05] mb-3">
            Your creator journey
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">starts now.</span>
          </h2>

          <p className="text-sm text-white/60 leading-relaxed mb-6">
            Buy any coin pack to unlock <span className="text-white font-semibold">Shop</span>, <span className="text-white font-semibold">Live</span>, and <span className="text-white font-semibold">Premium</span>. Your coins go straight to creators — <span className="text-white font-semibold">not us</span>.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#E53945]/15 text-[#ff6b75]">
                <ShoppingBag size={16} />
              </div>
              <p className="text-[11px] font-semibold text-white/80">Shop</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#E53945]/15 text-[#ff6b75]">
                <Radio size={16} />
              </div>
              <p className="text-[11px] font-semibold text-white/80">Go Live</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#E53945]/15 text-[#ff6b75]">
                <Crown size={16} />
              </div>
              <p className="text-[11px] font-semibold text-white/80">Premium</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/wallet?topup=true&unlock=creator-tools"
              onClick={close}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#E53945] to-[#ff5a4e] hover:brightness-110 text-white font-bold py-3.5 rounded-2xl transition shadow-[0_12px_30px_rgba(229,57,69,0.35)]"
            >
              <Coins size={17} />
              Buy Coins
            </Link>
            <button
              onClick={close}
              className="px-5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white/80 font-semibold py-3.5 rounded-2xl transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}