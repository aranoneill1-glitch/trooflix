"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import LivePlayer from "@/components/LivePlayer";

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
        .select("is_live, live_playback_url")
        .eq("username", username)
        .single();

      if (!error && data && data.is_live && data.live_playback_url) {
        setProfile(data);
      } else {
        router.push(`/profile/${username}`); // Kick them back to profile if not live
      }
      setLoading(false);
    }
    checkLiveStatus();
  }, [username, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black flex flex-col pt-16 px-4">
      <div className="max-w-5xl mx-auto w-full">
        <Link href={`/profile/${username}`} className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Profile
        </Link>
        
        {profile?.live_playback_url && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <LivePlayer whepUrl={profile.live_playback_url} />
          </div>
        )}
      </div>
    </main>
  );
}
