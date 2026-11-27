"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Radio } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

type LiveInvite = {
  id: string;
  fromName: string;
  fromAvatar: string | null;
  livePath: string;
};

export default function GlobalLiveInvite() {
  const router = useRouter();
  const [invite, setInvite] = useState<LiveInvite | null>(null);

  useEffect(() => {
    let channel: any;
    let mounted = true;
    const supabase = createClient();

    getCachedUser().then((u) => {
      if (!mounted || !u?.id) return;
      channel = supabase
        .channel(`live_invites_${u.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${u.id}` },
          async (payload) => {
            const n: any = payload.new;
            if (!n) return;
            const isLiveInvite = n.title === "Live invite" || String(n.message || "").includes("invited you to join their live");
            if (!isLiveInvite) return;
            const livePath = String(n.message || "").match(/\/live\/[A-Za-z0-9_.-]+/)?.[0] || "/live";

            let fromName = "Someone";
            let fromAvatar: string | null = null;
            if (n.actor_id) {
              try {
                const res = await fetch(`/api/profile?user_id=${n.actor_id}`, { cache: "no-store" });
                const data = await res.json();
                fromName = data?.profile?.display_name || data?.profile?.username || fromName;
                fromAvatar = data?.profile?.avatar_url || null;
              } catch {}
            }

            if (mounted) {
              setInvite({ id: String(n.id), fromName, fromAvatar, livePath });
            }
          }
        )
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const decline = () => setInvite(null);
  const accept = () => {
    if (!invite) return;
    const path = invite.livePath.includes("?") ? `${invite.livePath}&invite=1` : `${invite.livePath}?invite=1`;
    setInvite(null);
    router.push(path);
  };

  return (
    <AnimatePresence>
      {invite && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10006] bg-black/55"
            onClick={decline}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            className="fixed left-1/2 top-1/2 z-[10007] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-[#1c1c1e] to-[#0a0303] border border-[#E53945]/30 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full overflow-hidden bg-[#1c1c1e] border border-white/20">
                {invite.fromAvatar ? (
                  <img src={invite.fromAvatar} alt={invite.fromName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white">
                    {invite.fromName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-xs text-[#E53945] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-2">
                <Radio size={12} className="animate-pulse" /> Live Invite
              </p>
              <p className="text-xl font-black text-white leading-tight">
                {invite.fromName} is inviting you to go live
              </p>
              <p className="text-sm text-white/55 mt-2">Tap join to enter their live stream.</p>
            </div>
            <div className="flex border-t border-white/10">
              <button onClick={decline} className="flex-1 py-4 flex items-center justify-center gap-2 text-red-400 font-bold hover:bg-red-500/10 transition">
                <PhoneOff size={18} /> Decline
              </button>
              <button onClick={accept} className="flex-1 py-4 flex items-center justify-center gap-2 bg-green-600 text-white font-bold hover:bg-green-500 transition">
                <Phone size={18} /> Join
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
