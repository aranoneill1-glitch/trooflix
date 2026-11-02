"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedUser().then(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      setNotifications(data || []);
      setLoading(false);
    });
  }, []);

  const getIcon = (type: string) => {
    switch(type) {
      case "like": return <Heart size={20} className="text-[#E53945]" />;
      case "comment": return <MessageCircle size={20} className="text-blue-400" />;
      case "follow": return <UserPlus size={20} className="text-green-400" />;
      default: return <Bell size={20} className="text-white/50" />;
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-20">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <div className="flex items-center gap-4 mb-6 sticky top-20 z-30 bg-[#0a0303]/90 backdrop-blur-md py-2">
          <button onClick={() => window.history.back()} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
            <Bell size={40} className="mx-auto text-white/20 mb-4" />
            <h2 className="text-lg font-bold mb-1">No notifications yet</h2>
            <p className="text-sm text-white/50">When someone likes, comments, or follows you, it will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 transition border border-white/5 rounded-2xl cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{n.type === "like" ? "New Like" : n.type === "comment" ? "New Comment" : "New Follower"}</p>
                  <p className="text-xs text-white/50 truncate">{n.message || "Someone interacted with your content."}</p>
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
