"use client";

import Link from "next/link";
import { X, Lock, Sparkles } from "lucide-react";

export default function PaywallModal({
  onClose,
  onContinue,
  currentTime,
}: {
  onClose: () => void;
  onContinue: () => void;
  currentTime?: number;
}) {
  return (
    <div
      className="fixed inset-0 z-[10002] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-b from-[#1c1c1e] to-[#0a0303] border border-white/20 rounded-3xl w-full max-w-md p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#E53945]/20 rounded-full flex items-center justify-center">
            <Lock size={28} className="text-[#E53945]" />
          </div>

          <h2 className="text-2xl font-black mb-2">You've hit the 3-minute limit</h2>
          <p className="text-sm text-white/60 mb-6">
            Free accounts get a 3-minute preview of long-form videos. Upgrade to Plus to watch the rest — plus unlimited live streams, any-length Shorts, and a red glass tick.
          </p>

          <Link
            href="/upgrade"
            className="flex items-center justify-center gap-2 w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/30 mb-3"
          >
            <Sparkles size={16} /> Upgrade to Plus — $3.99/mo
          </Link>

          <button
            onClick={onContinue}
            className="block w-full bg-white/5 hover:bg-white/10 text-white/70 font-bold py-3 rounded-xl transition border border-white/10"
          >
            Continue with 3-min limit
          </button>

          <p className="text-[11px] text-white/40 mt-4">
            Already upgraded? Refresh the page.
          </p>
        </div>
      </div>
    </div>
  );
}
