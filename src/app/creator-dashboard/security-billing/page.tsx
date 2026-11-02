"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard, Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function SecurityBillingPage() {
  const [user, setUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [billingData, setBillingData] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    getCachedUser().then(setUser);
    fetch("/api/billing/status").then(r => r.json()).then(d => { setBillingData(d); setBillingLoading(false); }).catch(() => setBillingLoading(false));
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setPasswordMessage("Passwords do not match.");
    setPasswordLoading(true);
    setPasswordMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPasswordMessage(error.message);
    else { setPasswordMessage("Password updated successfully."); setNewPassword(""); setConfirmPassword(""); }
    setPasswordLoading(false);
  };

  const openStripePortal = async () => {
    if (!user) return;
    const res = await fetch("/api/billing/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else alert("Could not open billing portal. Please ensure Stripe is configured.");
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition"><ArrowRight size={20} className="rotate-180" /></Link>
          <div><h1 className="text-2xl font-bold">Security & Billing</h1><p className="text-sm text-white/50">Manage your account security and subscription.</p></div>
        </div>

        <div className="space-y-6">
          {/* Security Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6"><Shield className="text-[#E53945]" size={24} /><h2 className="text-lg font-bold">Change Password</h2></div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div><label className="block text-xs font-bold text-white/60 mb-1">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945]" placeholder="••••••••" /></div>
              <div><label className="block text-xs font-bold text-white/60 mb-1">Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945]" placeholder="••••••••" /></div>
              {passwordMessage && <p className={"text-sm " + (passwordMessage.includes("success") ? "text-green-400" : "text-red-400")}>{passwordMessage}</p>}
              <button type="submit" disabled={passwordLoading} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition">{passwordLoading ? "Updating..." : "Update Password"}</button>
            </form>
          </motion.div>

          {/* Billing Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6"><CreditCard className="text-[#D4AF37]" size={24} /><h2 className="text-lg font-bold">Billing & Subscription</h2></div>
            {billingLoading ? <p className="text-white/50">Loading billing details...</p> : billingData?.subscription ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3"><span className="text-sm text-white/60">Plan</span><span className="font-bold">{billingData.subscription.planName}</span></div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3"><span className="text-sm text-white/60">Next Payment</span><span className="font-bold">{billingData.subscription.nextDate}</span></div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3"><span className="text-sm text-white/60">Amount</span><span className="font-bold">{billingData.subscription.amount}</span></div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3"><span className="text-sm text-white/60">Card on File</span><span className="font-bold">{billingData.subscription.cardBrand} •••• {billingData.subscription.cardLast4}</span></div>
                <button onClick={openStripePortal} className="w-full mt-4 bg-[#D4AF37] hover:bg-[#c19b2e] text-black font-bold py-3 rounded-xl transition">Manage Billing & Invoices</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-white/50 text-sm">No active creator subscription found.</p>
                <button onClick={() => window.location.href = "/upgrade"} className="w-full bg-[#D4AF37] hover:bg-[#c19b2e] text-black font-bold py-3 rounded-xl transition">Upgrade to Creator Tier</button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
