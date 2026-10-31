"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { Send, MessageCircle } from "lucide-react";

type ChatMessage = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  message: string;
  created_at: string;
};

export default function LiveChat({ liveInputId, className = "h-[400px] md:h-[500px]" }: { liveInputId: string, className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sending, setSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) return;
      setUser(u);
      const { data } = await supabase.from("profiles").select("display_name, avatar_url, username").eq("user_id", u.id).single();
      if (data) setProfile(data);
    });

    supabase
      .from("live_chat_messages")
      .select("*")
      .eq("live_input_id", liveInputId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data);
        setTimeout(scrollToBottom, 100);
      });

    const channel = supabase
      .channel(`live_chat_${liveInputId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `live_input_id=eq.${liveInputId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveInputId, supabase]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile || sending) return;
    setSending(true);

    const text = newMessage.trim();
    setNewMessage(""); 

    await supabase.from("live_chat_messages").insert({
      live_input_id: liveInputId,
      user_id: user.id,
      display_name: profile.display_name || profile.username || "User",
      avatar_url: profile.avatar_url,
      message: text,
    });

    setSending(false);
    scrollToBottom();
  };

  return (
    <div className={`flex flex-col w-full bg-[#0f0f12]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
        <MessageCircle size={18} className="text-[#E53945]" />
        <h3 className="font-bold text-white text-sm tracking-wide">Live Chat</h3>
        <span className="ml-auto text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
          Live
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30">
            <MessageCircle size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Chat is quiet...</p>
            <p className="text-xs mt-1">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2.5 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              {msg.avatar_url ? (
                <img src={msg.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-white/10">
                  {msg.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-white/50 mb-0.5">{msg.display_name}</span>
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-white/90 break-words inline-block w-fit">
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {user ? (
        <form onSubmit={sendMessage} className="p-3 bg-black/40 border-t border-white/10 flex gap-2 shrink-0">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]/50 transition placeholder:text-white/30"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 flex items-center justify-center transition flex-shrink-0 shadow-lg shadow-[#E53945]/20"
          >
            <Send size={16} className="text-white ml-0.5" />
          </button>
        </form>
      ) : (
        <div className="p-4 bg-black/40 border-t border-white/10 text-center text-sm text-white/50 shrink-0">
          Please log in to join the chat.
        </div>
      )}
    </div>
  );
}
