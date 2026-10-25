"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ShoppingBag, ArrowLeft } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const creatorSlug = searchParams.get("creator");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="max-w-md w-full bg-[#0f0f12]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)]"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 size={48} className="text-green-400" />
        </motion.div>

        <h1 className="text-3xl font-black mb-2">Order Confirmed!</h1>
        <p className="text-white/60 mb-8 leading-relaxed">
          Thank you for ordering from <span className="text-white font-bold">Trooflix</span>. 
          Your payment was successful, and the creator has been notified.
        </p>

        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-8">
          <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">Next Step</p>
          <p className="text-sm text-white/80">The creator will ship your item shortly. You can track your delivery status in your Orders dashboard.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/orders"
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3.5 rounded-xl transition hover:scale-[1.02]"
          >
            <ShoppingBag size={18} /> View My Orders
          </Link>
          
          {creatorSlug && (
            <Link
              href={`/podcaster/${creatorSlug}`}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition border border-white/10"
            >
              <ArrowLeft size={18} /> Back to Creator
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white/50">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
