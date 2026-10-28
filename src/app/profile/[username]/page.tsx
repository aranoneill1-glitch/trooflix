"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus, MessageSquare, CheckCircle2, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contentView, setContentView] = useState<"grid" | "list">("grid");

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
      
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6">
        
        <Link href="/search" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition mb-6 text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Search
        </Link>

        {/* PROFILE HEADER */}
        <div className="flex flex-col mb-6 w-full">
          
          {/* TOP ROW: Avatar & Stats */}
          <div className="flex items-center gap-4 w-full mb-4">
            {/* Avatar */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 shrink-0">
              <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold">{displayName.charAt(0)}</div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around md:justify-start md:gap-8 px-2">
              <div className="text-center md:text-left">
                <span className="font-bold text-white block text-xl">0</span> 
                <span className="text-white/50 text-[11px] uppercase tracking-wider">Following</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-bold text-white block text-xl">0</span> 
                <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-bold text-white block text-xl">0</span> 
                <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: Name, Follow Button, Username, Handles */}
          <div className="px-1">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white">
                {displayName} {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760]" fill="currentColor" />}
              </h1>
              {/* FOLLOW BUTTON */}
              <button className="shrink-0 bg-white text-black font-bold px-5 py-1.5 rounded-full hover:bg-gray-200 transition shadow-lg text-sm">
                Follow
              </button>
            </div>
            <p className="text-sm md:text-base text-white/50 mb-3">@{profile.username}</p>
            
            {/* Social Handles */}
            <div className="flex items-center gap-4 mb-4">
              {profile.instagram_handle && (
                <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                  <InstagramIcon size={14} />
                  <span className="text-xs font-semibold">{profile.instagram_handle}</span>
                </a>
              )}
              {profile.x_handle && (
                <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                  <XIcon size={14} />
                  <span className="text-xs font-semibold">{profile.x_handle}</span>
                </a>
              )}
            </div>

            {/* Bio */}
            <p className="text-sm text-white/60 leading-relaxed">
              {profile.bio || "No bio yet."}
            </p>
          </div>
        </div>

        {/* MESSAGE BUTTON (Full width for standard users) */}
        <div className="flex gap-3 mb-8 w-full">
          <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-full transition border border-white/10">
            <MessageSquare size={18} /> Message
          </button>
        </div>

        {/* TABS & VIEW TOGGLE */}
        <div className="flex items-center justify-between border-b border-white/10 mb-6">
          <div className="flex items-center gap-8">
            <button className="pb-3 text-sm font-bold text-white border-b-2 border-[#E53945]">Posts</button>
          </div>

          <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
            <button
              onClick={() => setContentView("grid")}
              className={`p-1.5 rounded-md transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setContentView("list")}
              className={`p-1.5 rounded-md transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* CONTENT AREA (Empty for now, waiting for standard posts) */}
        <div className="text-center py-20 text-white/50">
          No posts yet.
        </div>

      </div>

      <MobileBottomNav />
    </main>
  );
}
