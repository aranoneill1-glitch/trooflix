"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";
import TopBar from "@/components/TopBar";
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

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <Link href="/search" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition mb-6 text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Search
        </Link>

        <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 mb-4">
            <div className="w-full h-full rounded-full border-4 border-[#1c1c1e] overflow-hidden bg-black">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
                  {profile.display_name?.charAt(0) || "U"}
                </div>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-black flex items-center gap-2">
            {profile.display_name || "User"} 
            {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760]" fill="currentColor" />}
          </h1>
          <p className="text-white/50 mb-4">@{profile.username}</p>
          
          <p className="text-sm text-white/70 max-w-md mb-6">{profile.bio || "No bio yet."}</p>

          <button className="flex items-center justify-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition shadow-lg w-full max-w-xs">
            <UserPlus size={18} /> Follow
          </button>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
