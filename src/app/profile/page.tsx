"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, Bookmark, ShoppingBag, Play, CheckCircle2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "basket">("list");

  useEffect(() => {
    getCachedUser().then((u) => {
      if (u) {
        setUser(u);
        fetch(`/api/profile?user_id=${u.id}`)
          .then((r) => r.json())
          .then((d) => {
            setProfile(d.profile);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">You are not logged in</h1>
        <Link href="/login" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Log In</Link>
      </main>
    );
  }

  // Mock data for the new tabs
  const savedList = [
    { id: 1, title: "The Last Days Of The Big Lie", creator: "SSECA", image: "https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80", duration: "1:35:01" },
    { id: 2, title: "The Angel Of Death", creator: "SSECA", image: "https://images.unsplash.com/photo-1493225457124-a1a2a5f5c918?w=500&q=80", duration: "34 min" },
  ];

  const basketHistory = [
    { id: 1, item: "Classic Logo Tee", price: 25.00, date: "Oct 24, 2026", status: "Delivered" },
    { id: 2, item: "Director's Hoodie", price: 45.00, date: "Sep 12, 2026", status: "Delivered" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-sans">
      <TopBar />

      <div className="max-w-2xl mx-auto pt-24 px-4">
        
        {/* INSTAGRAM-STYLE HEADER */}
        <div className="flex items-center gap-6 md:gap-10 mb-8">
          {/* Avatar */}
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 shrink-0">
            <div className="w-full h-full rounded-full border-2 border-[#0a0a0a] overflow-hidden bg-[#1c1c1e]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                  {profile?.display_name?.[0] || user.email?.[0] || "U"}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 flex justify-around md:justify-start md:gap-12 text-center">
            <div>
              <p className="text-xl md:text-2xl font-bold">0</p>
              <p className="text-xs md:text-sm text-white/50">Following</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold">0</p>
              <p className="text-xs md:text-sm text-white/50">Followers</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-[#E53945]">1</p>
              <p className="text-xs md:text-sm text-white/50">Active Sub</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-6">
          <h1 className="text-lg font-bold flex items-center gap-2">
            {profile?.display_name || "Trooflix User"}
            {profile?.is_verified && <CheckCircle2 size={16} className="text-[#1ed760]" fill="currentColor" />}
          </h1>
          <p className="text-sm text-white/50">@{profile?.username || user.email?.split('@')[0]}</p>
          {profile?.bio && <p className="text-sm mt-2">{profile.bio}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-8">
          <button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-sm transition">
            Edit Profile
          </button>
          <Link href="/settings" className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-sm transition flex items-center justify-center gap-2">
            <Settings size={16} /> Settings
          </Link>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === "list" ? "text-white border-b-2 border-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Bookmark size={18} /> My List
          </button>
          <button
            onClick={() => setActiveTab("basket")}
            className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === "basket" ? "text-white border-b-2 border-white" : "text-white/50 hover:text-white"
            }`}
          >
            <ShoppingBag size={18} /> Basket
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "list" && (
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {savedList.map((video) => (
              <Link key={video.id} href={`/watch/${video.id}`} className="relative aspect-square group overflow-hidden rounded-sm md:rounded-md">
                <img src={video.image} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={24} fill="white" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {video.duration}
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === "basket" && (
          <div className="flex flex-col gap-4">
            {basketHistory.map((order) => (
              <div key={order.id} className="bg-[#1c1c1e] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">{order.item}</h3>
                  <p className="text-xs text-white/50">{order.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#E53945]">${order.price.toFixed(2)}</p>
                  <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <MobileBottomNav />
    </main>
  );
}
