"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Radio, Lock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import LivePlayer from "@/components/LivePlayer";
import LiveChat from "@/components/LiveChat";

export default function WatchLivePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isHost, setIsHost] = useState(false);
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
      
      if (currentUser && currentUser.id === profileData.user_id) setIsHost(true);
      
      const access = await checkAccess(profileData, currentUser);
      setHasAccess(access);
      setLoading(false);

      // Setup Realtime Listener for live visibility changes
      const channel = supabase
        .channel(`visibility_${profileData.user_id}_${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles" },
          async (payload) => {
            // Compare user_id since username might not be in the update payload
            if (payload.new.user_id === profileData.user_id) {
              console.log("Realtime visibility change detected! New visibility:", payload.new.live_visibility);
              
              const updatedProfile = { ...profileData, ...payload.new };
              setProfile(updatedProfile);
              
              // Re-verify access instantly
              const newAccess = await checkAccess(updatedProfile, currentUser);
              console.log("Has access after check:", newAccess);
              setHasAccess(newAccess);
            }
          }
        )
        .subscribe((status) => {
          console.log("Visibility Realtime Status:", status);
        });

      return () => { supabase.removeChannel(channel); };
    }
    loadInitial();
  }, [username, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0303] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pt-20 pb-10 px-4 md:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-6">
        
        <div className="flex-1 lg:w-3/4 flex flex-col gap-5">
          
          {/* Top Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-12 h-12 rounded-full object-cover border-2 border-[#E53945] shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#E53945] flex items-center justify-center text-lg font-bold border-2 border-white/20 shadow-lg">
                  {profile?.display_name?.charAt(0) || "C"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-white font-bold text-base leading-tight">{profile?.display_name || username}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </div>
                  {profile?.live_visibility === "subscribers" && (
                     <div className="bg-[#D4AF37] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 shadow-sm animate-in fade-in zoom-in">
                     <Lock size={10} /> SUBS ONLY
                   </div>
                  )}
                </div>
              </div>
            </div>

            <Link href={`/profile/${username}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white transition text-sm font-semibold bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <ArrowLeft size={16} /> Back to Profile
            </Link>
          </div>

          {/* Video Player OR Paywall */}
          {hasAccess ? (
            <div className="w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 animate-in fade-in">
              <LivePlayer liveInputId={profile.live_input_id} />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 bg-[#1c1c1e] flex flex-col items-center justify-center p-6 text-center border border-[#D4AF37]/30 relative animate-in fade-in zoom-in duration-500">
               {profile?.avatar_url && (
                 <div className="absolute inset-0 opacity-20 bg-cover bg-center blur-xl" style={{ backgroundImage: `url(${profile.avatar_url})` }} />
               )}
               <div className="relative z-10 flex flex-col items-center">
                 <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4 border border-[#D4AF37]/30 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                    <Lock size={40} className="text-[#D4AF37]" />
                 </div>
                 <h2 className="text-2xl font-black text-white mb-2">Subscribers Only Stream</h2>
                 <p className="text-white/60 mb-6 max-w-sm">The creator has restricted this live broadcast to subscribers. Subscribe to join the stream and chat.</p>
                 <Link href={`/profile/${username}`} className="bg-[#D4AF37] hover:bg-[#c19b2e] text-black font-bold px-8 py-3 rounded-xl transition shadow-lg">
                   Subscribe to Watch
                 </Link>
               </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Chat */}
        {profile?.live_input_id && hasAccess && (
          <div className="w-full lg:w-1/4 flex flex-col h-[500px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-24">
            <LiveChat liveInputId={profile.live_input_id} className="h-full shadow-2xl" />
          </div>
        )}

      </div>
    </main>
  );
}
