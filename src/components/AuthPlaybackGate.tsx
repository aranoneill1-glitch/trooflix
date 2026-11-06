"use client";

import Link from "next/link";
import { X, Sparkles, Check } from "lucide-react";

export default function AuthPlaybackGate({
  onClose,
  videoTitle,
  returnUrl,
}: {
  onClose: () => void;
  videoTitle?: string;
  returnUrl?: string;
}) {
  const signupHref = returnUrl ? `/signup?redirect=${encodeURIComponent(returnUrl)}` : "/signup";
  const loginHref = returnUrl ? `/login?redirect=${encodeURIComponent(returnUrl)}` : "/login";

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-b from-[#1c1c1e] to-[#0a0303] border border-white/20 rounded-3xl w-full max-w-md p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-white"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#E53945]/20 rounded-full flex items-center justify-center">
            <Sparkles size={28} className="text-[#E53945]" />
          </div>

          <h2 className="text-2xl font-black mb-2">Sign in to watch</h2>
          <p className="text-sm text-white/60 mb-6">
            {videoTitle ? `"${videoTitle}" — j` : "J"}oin Trooflix to watch full videos.
          </p>

          <div className="space-y-2 mb-6 text-left bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Check size={14} className="text-green-500" /> Free 3-min previews
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Check size={14} className="text-green-500" /> Unlimited Shorts
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Check size={14} className="text-green-500" /> Like, comment & message
            </div>
          </div>

          <Link
            href={signupHref}
            className="block w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/30 mb-3"
          >
            Create Free Account
          </Link>
          <Link
            href={loginHref}
            className="block w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition border border-white/10"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
}
