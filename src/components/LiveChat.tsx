"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { Send, MessageCircle, Smile, Gift, DollarSign } from "lucide-react";

type ChatMessage = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  message: string;
  created_at: string;
  type?: string;
  metadata?: any;
};

const EMOJIS = ["😂", "🔥", "😍", "👏", "😮", "💯", "🚀", "💩", "🎉", "😢", "👀", "🙌", "💪", "🤔", "🙏", "❤️"];

export default function LiveChat({ liveInputId, className = "h-full" }: { liveInputId: string, className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!liveInputId) return;

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
      });

    const channel = supabase
      .channel(`live_chat_${liveInputId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_input_id=eq.${liveInputId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [liveInputId, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    setShowEmojis(false);

    const text = newMessage.trim();
    setNewMessage(""); 

    const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || "User";
    
    const { data, error } = await supabase.from("live_chat_messages").insert({
      live_input_id: liveInputId,
      user_id: user.id,
      display_name: displayName,
      avatar_url: profile?.avatar_url || null,
      message: text,
      type: "text"
    }).select().single();

    if (error) {
      console.error("Failed to send message:", error);
      setNewMessage(text);
    } else if (data) {
      setMessages((prev) => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data as ChatMessage];
      });
    }
    setSending(false);
  };

  const sendTip = async (amount: number) => {
    if (!user) return alert("Please log in to leave a tip.");
    const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || "User";
    
    const { data, error } = await supabase.from("live_chat_messages").insert({
      live_input_id: liveInputId,
      user_id: user.id,
      display_name: displayName,
      avatar_url: profile?.avatar_url || null,
      message: `Left a $${amount} tip!`,
      type: "tip",
      metadata: { amount }
    }).select().single();

    if (error) console.error("Tip failed:", error);
  };

  return (
    <div className={`flex flex-col w-full bg-[#18181b] ${className}`}>
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[#18181b] shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-[#E53945]" />
          <h3 className="font-bold text-white text-sm tracking-wide">Stream Chat</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-white/70 uppercase">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide min-h-0 bg-[#18181b]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/20">
            <MessageCircle size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Chat is quiet...</p>
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
              
              <div className="flex flex-col min-w-0 leading-tight w-full">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-bold text-white/50">{msg.display_name}</span>
                  {msg.type === "tip" && <span className="text-[9px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-1 rounded">TIP</span>}
                </div>
                
                {msg.type === "product" && msg.metadata ? (
                  <div className="bg-[#26262b] border border-white/10 rounded-xl overflow-hidden shadow-lg w-full max-w-[240px]">
                    <img src={msg.metadata.image_url} alt="" className="w-full aspect-video object-cover" />
                    <div className="p-3">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{msg.metadata.name}</h4>
                      <p className="text-emerald-400 font-bold text-sm mt-0.5">${(msg.metadata.price_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ) : msg.type === "tip" && msg.metadata ? (
                  <div className="bg-gradient-to-r from-[#D4AF37]/20 to-transparent border border-[#D4AF37]/30 rounded-xl p-3 flex items-center gap-3 w-max max-w-full">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg shrink-0">
                      <DollarSign size={16} className="text-black font-bold" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#D4AF37]">{msg.display_name} tipped ${msg.metadata.amount}!</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] text-white/90 break-words leading-relaxed bg-[#26262b] px-3 py-2 rounded-2xl rounded-tl-sm w-max max-w-full">
                    {msg.message}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-[#18181b] border-t border-white/5 shrink-0 relative">
        {showEmojis && (
          <div className="absolute bottom-16 left-4 right-4 bg-[#26262b] border border-white/10 rounded-xl p-3 shadow-2xl z-50 grid grid-cols-8 gap-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform p-1">{e}</button>
            ))}
          </div>
        )}
        
        {user ? (
          <form onSubmit={sendMessage} className="flex gap-2 items-center bg-[#26262b] rounded-full px-2 py-1.5 border border-white/10">
            <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="p-1.5 text-white/40 hover:text-white transition-colors"><Smile size={18} /></button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message"
              className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
            <button type="submit" disabled={!newMessage.trim() || sending} className="w-8 h-8 rounded-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 flex items-center justify-center transition flex-shrink-0">
              <Send size={14} className="text-white ml-0.5" />
            </button>
          </form>
        ) : (
          <div className="text-center text-xs text-white/50 py-2">Log in to chat</div>
        )}
      </div>
    </div>
  );
}
