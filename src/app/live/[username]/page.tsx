"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import LivePlayer from "@/components/LivePlayer";
import LiveChat from "@/components/LiveChat";

export default function WatchLivePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLiveStatus() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, is_live, live_input_id")
        .eq("username", username)
        .single();

      // Only check for is_live and live_input_id now
      if (!error && data && data.is_live && data.live_input_id) {
        setProfile(data);
      } else {
        router.push(`/profile/${username}`); 
      }
      setLoading(false);
    }
    checkLiveStatus();
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
        
        {/* LEFT COLUMN: Video & Info */}
        <div className="flex-1 lg:w-3/4 flex flex-col gap-5">
          
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/profile/${username}`} className="inline-flex items-center gap-2 text-white/50 hover:text-white transition text-sm font-semibold bg-white/5 px-4 py-2 rounded-full border border-white/10 w-fit">
              <ArrowLeft size={16} /> Back to Profile
            </Link>
          </div>

          {/* Video Player - Now only checks for live_input_id */}
          {profile?.live_input_id && (
            <div className="w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
              <LivePlayer liveInputId={profile.live_input_id} />
            </div>
          )}

          {/* Creator Info Header */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-14 h-14 rounded-full object-cover border-2 border-[#E53945]" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#E53945] flex items-center justify-center text-xl font-bold border-2 border-white/20">
                {profile?.display_name?.charAt(0) || "C"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {profile?.display_name || username} 
                <Radio size={16} className="text-red-500 animate-pulse" />
              </h1>
              <p className="text-sm text-white/50">@{username} is streaming live</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Chat */}
        {profile?.live_input_id && (
          <div className="w-full lg:w-1/4 flex flex-col h-[500px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-24">
            <LiveChat liveInputId={profile.live_input_id} className="h-full shadow-2xl" />
          </div>
        )}

      </div>
    </main>
  );
}
