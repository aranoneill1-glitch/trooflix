"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import LivePlayer from "@/components/LivePlayer";

export default function WatchLivePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  const checkAccess = async (profileData: any, currentUser: any) => {
    if (!profileData) return false;
    if (currentUser && currentUser.id === profileData.user_id) return true;
    if (profileData.live_visibility === "public" || !profileData.live_visibility) return true;

    if (profileData.live_visibility === "subscribers") {
      if (!currentUser) return false;
      const supabase = createClient();
      const targetCreatorId = profileData.creator_id || profileData.user_id;
      const { count } = await supabase.from("creator_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("subscriber_user_id", currentUser.id)
        .eq("creator_id", targetCreatorId);
      return (count || 0) > 0;
    }
    return false;
  };

  useEffect(() => {
    async function loadInitial() {
      const supabase = createClient();
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("user_id, creator_id, display_name, avatar_url, is_live, live_input_id, live_visibility")
        .eq("username", username)
        .single();

      if (error || !profileData || !profileData.is_live || !profileData.live_input_id) {
        router.push(`/profile/${username}`);
        return;
      }

      setProfile(profileData);
      const currentUser = await getCachedUser();
      setUser(currentUser);

      const access = await checkAccess(profileData, currentUser);
      setHasAccess(access);
      setLoading(false);

      const channel = supabase
        .channel(`visibility_${profileData.user_id}_${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles" },
          async (payload) => {
            if (payload.new.user_id === profileData.user_id) {
              const updatedProfile = { ...profileData, ...payload.new };
              setProfile(updatedProfile);
              const newAccess = await checkAccess(updatedProfile, currentUser);
              setHasAccess(newAccess);
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    loadInitial();
  }, [username, router]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <main className="h-[100dvh] bg-black text-white relative overflow-hidden flex items-center justify-center p-6">
        {profile?.avatar_url && (
          <div className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl scale-110" style={{ backgroundImage: `url(${profile.avatar_url})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
        <Link href={`/profile/${username}`} className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-4 z-20 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white">
          <ArrowLeft size={18} />
        </Link>
        <div className="relative z-10 w-full max-w-md text-center bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="w-20 h-20 bg-[#D4AF37]/12 rounded-full flex items-center justify-center mb-5 mx-auto border border-[#D4AF37]/30">
            <Lock size={36} className="text-[#D4AF37]" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/80 mb-2">Subscribers Only</p>
          <h1 className="text-3xl font-black text-white mb-3">Live stream locked</h1>
          <p className="text-white/60 mb-7 leading-relaxed">Subscribe to {profile?.display_name || username} to watch this live stream and join the chat.</p>
          <Link href={`/profile/${username}`} className="inline-flex items-center justify-center bg-[#D4AF37] hover:bg-[#c19b2e] text-black font-bold px-8 py-3.5 rounded-full transition shadow-lg">
            Subscribe to Watch
          </Link>
        </div>
      </main>
    );
  }

  return (
    <LivePlayer
      liveInputId={profile.live_input_id}
      creatorId={profile.creator_id || profile.user_id}
      hostUserId={profile.user_id}
      creatorName={profile.display_name || username}
      creatorAvatar={profile.avatar_url}
      username={username}
    />
  );
}
