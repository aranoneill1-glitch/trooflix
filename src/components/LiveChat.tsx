"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { Send, MessageCircle, Smile } from "lucide-react";

type ChatMessage = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  message: string;
  created_at: string;
};

const EMOJIS = ["😂", "🔥", "😍", "👏", "😮", "💯", "🚀", "💩", "🎉", "😢", "👀", "🙌", "💪", "🤔", "🙏", "❤️"];

export default function LiveChat({ liveInputId, className = "h-[400px] md:h-[500px]" }: { liveInputId: string, className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  
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
    setShowEmojis(false);

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
    <div className={`flex flex-col w-full bg-[#0f0f12]/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative ${className}`}>
      
      {/* Header */}
      <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
        <MessageCircle size={18} className="text-[#E53945]" />
        <h3 className="font-bold text-white text-sm tracking-wide">Live Chat</h3>
        <span className="ml-auto text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse border border-red-500/20">
          Live
        </span>
      </div>

      {/* Messages */}
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
                <img src={msg.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5 border border-white/10" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#E53945] flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 text-white shadow-sm">
                  {msg.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[11px] font-semibold text-white/40 mb-1">{msg.display_name}</span>
                <div className="text-[13px] text-white/90 break-words leading-relaxed">
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Emoji Menu */}
      {showEmojis && (
        <div className="absolute bottom-[70px] left-3 right-3 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50">
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform p-1">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      {user ? (
        <form onSubmit={sendMessage} className="p-3 bg-black/40 border-t border-white/10 flex gap-2 items-center shrink-0 z-50 w-full overflow-hidden">
          <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="p-2 text-white/50 hover:text-white transition-colors">
            <Smile size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]/50 transition placeholder:text-white/30"
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
