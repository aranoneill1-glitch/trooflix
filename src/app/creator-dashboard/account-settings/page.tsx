"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Shield, CreditCard, EyeOff, Eye, Trash2, Ban, Unlock, ChevronLeft, Settings, KeyRound } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

type BlockedUser = { userId: string; username: string; displayName: string; avatarUrl: string | null };

export default function AccountSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [savingHidden, setSavingHidden] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) { window.location.href = "/login"; return; }
      setUser(u);
      try {
        const pRes = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
        const pData = await pRes.json();
        setIsHidden(!!pData?.profile?.is_hidden);
      } catch {}
      try {
        const bRes = await fetch(`/api/users/block?blockerId=${u.id}`, { cache: "no-store" });
        const bData = await bRes.json();
        setBlockedUsers(Array.isArray(bData?.users) ? bData.users : []);
      } catch {}
      setBlockedLoading(false);
      setLoading(false);
    });
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPasswordMessage("Passwords do not match."); return; }
    if (newPassword.length < 6) { setPasswordMessage("Password must be at least 6 characters."); return; }
    setPasswordLoading(true);
    setPasswordMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPasswordMessage(error.message);
    else { setPasswordMessage("Password updated successfully."); setNewPassword(""); setConfirmPassword(""); }
    setPasswordLoading(false);
  };

  const openBilling = async () => {
    if (!user) return;
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else alert("Could not open billing portal.");
    } finally { setBillingLoading(false); }
  };

  const toggleHidden = async () => {
    if (!user) return;
    const next = !isHidden;
    if (next && !confirm("Hide your account? Your profile will be less visible.")) return;
    setSavingHidden(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isHidden: next }),
      });
      if (!res.ok) throw new Error("Failed");
      setIsHidden(next);
    } catch { alert("Could not update account visibility."); }
    finally { setSavingHidden(false); }
  };

  const unblockUser = async (blockedId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/block?blockerId=${user.id}&blockedId=${blockedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setBlockedUsers((prev) => prev.filter((u) => u.userId !== blockedId));
    } catch { alert("Could not unblock user."); }
  };

  const deleteAccount = async () => {
    if (!user) return;
    const c1 = confirm("Delete your account? This action cannot be undone.");
    if (!c1) return;
    const c2 = confirm("Are you absolutely sure? Your account and data may be permanently removed.");
    if (!c2) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      const supabase = createClient();
      await supabase.auth.signOut();
      clearUserCache();
      window.location.href = "/";
    } catch (e: any) {
      alert(e?.message || "Could not delete account. Please contact support.");
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)]">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition"><ChevronLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Settings size={22} /> Settings</h1>
            <p className="text-sm text-white/50">Manage your account, privacy, and billing.</p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5"><KeyRound className="text-[#E53945]" size={22} /><h2 className="text-lg font-bold">Change Password</h2></div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div><label className="block text-xs font-bold text-white/60 mb-1">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945]" placeholder="••••••••" /></div>
              <div><label className="block text-xs font-bold text-white/60 mb-1">Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945]" placeholder="••••••••" /></div>
              {passwordMessage && <p className={`text-sm ${passwordMessage.includes("success") ? "text-green-400" : "text-red-400"}`}>{passwordMessage}</p>}
              <button type="submit" disabled={passwordLoading} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition">{passwordLoading ? "Updating..." : "Update Password"}</button>
            </form>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4"><CreditCard className="text-[#D4AF37]" size={22} /><h2 className="text-lg font-bold">Billing</h2></div>
            <p className="text-sm text-white/55 mb-4">Manage your subscription, payment methods, and invoices.</p>
            <button onClick={openBilling} disabled={billingLoading} className="w-full bg-[#D4AF37] hover:bg-[#c19b2e] text-black font-bold py-3 rounded-xl transition disabled:opacity-60">{billingLoading ? "Opening..." : "Manage Billing"}</button>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">{isHidden ? <EyeOff className="text-yellow-400" size={22} /> : <Eye className="text-white/70" size={22} />}<h2 className="text-lg font-bold">Hide Account</h2></div>
                <p className="text-sm text-white/55">Make your account less visible. You can unhide it anytime.</p>
              </div>
              <button onClick={toggleHidden} disabled={savingHidden} className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition ${isHidden ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" : "bg-white/10 text-white border border-white/10"}`}>{savingHidden ? "..." : isHidden ? "Hidden" : "Hide"}</button>
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4"><Ban className="text-red-400" size={22} /><h2 className="text-lg font-bold">Blocked Users</h2></div>
            {blockedLoading ? (
              <p className="text-sm text-white/50">Loading...</p>
            ) : blockedUsers.length === 0 ? (
              <p className="text-sm text-white/50">No blocked users.</p>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between gap-3 bg-black/20 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/60">{(u.displayName || "U")[0]}</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{u.displayName}</p>
                        <p className="text-xs text-white/45 truncate">@{u.username}</p>
                      </div>
                    </div>
                    <button onClick={() => unblockUser(u.userId)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"><Unlock size={14} /> Unblock</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2"><Trash2 className="text-red-400" size={22} /><h2 className="text-lg font-bold text-red-300">Delete Account</h2></div>
            <p className="text-sm text-white/55 mb-4">Permanently delete your account. This cannot be undone.</p>
            <button onClick={deleteAccount} disabled={deleting} className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-200 font-bold py-3 rounded-xl transition disabled:opacity-60">{deleting ? "Deleting..." : "Delete Account"}</button>
          </section>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
