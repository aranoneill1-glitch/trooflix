"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus, MessageSquare, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
      
      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    }
    if (username) loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">User not found</h1>
        <Link href="/" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Go Home</Link>
      </main>
    );
  }

  const displayName = profile.display_name || "User";

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 pt-24">
        
        <Link href="/search" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition mb-8 text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="flex flex-col items-center text-center">
          
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 mb-4 shrink-0">
            <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Name & Username */}
          <h1 className="text-2xl md:text-3xl font-black flex items-center justify-center gap-2 text-white mb-1">
            {displayName} 
            {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760]" fill="currentColor" />}
          </h1>
          <p className="text-white/50 mb-6">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-white/70 max-w-md mb-8 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-12 mb-8 w-full">
            <div className="text-center">
              <span className="font-bold text-white block text-xl">0</span> 
              <span className="text-white/50 text-[11px] uppercase tracking-wider">Following</span>
            </div>
            <div className="text-center">
              <span className="font-bold text-white block text-xl">0</span> 
              <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full max-w-sm mx-auto">
            <button className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition shadow-lg text-sm">
              <UserPlus size={18} /> Follow
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-full transition border border-white/10 text-sm">
              <MessageSquare size={18} /> Message
            </button>
          </div>

        </div>

      </div>

      <MobileBottomNav />
    </main>
  );
}
