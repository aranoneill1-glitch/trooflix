"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { Send, MessageCircle, Smile, AlertCircle, Gift, DollarSign } from "lucide-react";

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

export default function LiveChat({ liveInputId, className = "h-[400px] md:h-[500px]" }: { liveInputId: string, className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
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
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

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

    if (error) {
      console.error("Tip failed:", error);
      alert("Failed to send tip. (Payment integration coming soon!)");
    }
  };

  const handleCustomTip = () => {
    const amount = prompt("Enter a custom tip amount ($):");
    if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
      sendTip(Number(amount));
    }
  };

  return (
    <div className={`flex flex-col w-full bg-[#0f0f12]/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative ${className}`}>
      
      <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
        <MessageCircle size={18} className="text-[#E53945]" />
        <h3 className="font-bold text-white text-sm tracking-wide">Live Chat</h3>
        <div className="ml-auto flex items-center gap-2">
          {!isConnected && <AlertCircle size={14} className="text-yellow-500 animate-pulse" />}
          <span className="text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse border border-red-500/20">Live</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30">
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
                <span className="text-[11px] font-semibold text-white/40 mb-1">{msg.display_name}</span>
                
                {/* RENDER PRODUCT CARD */}
                {msg.type === "product" && msg.metadata ? (
                  <div className="mt-1 bg-[#1c1c1e] border border-[#E53945]/30 rounded-xl overflow-hidden shadow-lg w-full max-w-[240px]">
                    <div className="relative aspect-video bg-black/50">
                      <img src={msg.metadata.image_url} alt={msg.metadata.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-[#E53945] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wider animate-pulse">
                        LIVE DEAL
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-bold text-white line-clamp-1">{msg.metadata.name}</h4>
                      <p className="text-emerald-400 font-bold text-sm mt-0.5">${(msg.metadata.price_cents / 100).toFixed(2)}</p>
                      <a href={`/shop/${msg.metadata.id}`} target="_blank" rel="noreferrer" className="mt-2 w-full bg-white text-black font-bold text-xs py-2 rounded-lg flex items-center justify-center hover:bg-gray-200 transition">
                        Buy Now
                      </a>
                    </div>
                  </div>
                ) : msg.type === "tip" && msg.metadata ? (
                  /* RENDER TIP CARD */
                  <div className="mt-1 bg-gradient-to-r from-[#D4AF37]/20 to-transparent border border-[#D4AF37]/40 rounded-xl p-3 shadow-[0_0_15px_rgba(212,175,55,0.15)] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg shrink-0">
                      <DollarSign size={16} className="text-black font-bold" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#D4AF37]">{msg.display_name} tipped ${msg.metadata.amount}!</p>
                      <p className="text-[10px] text-[#D4AF37]/70 uppercase tracking-wider font-bold mt-0.5">Support the stream</p>
                    </div>
                  </div>
                ) : (
                  /* RENDER NORMAL TEXT */
                  <div className="text-[13px] text-white/90 break-words leading-relaxed">
                    {msg.message}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showEmojis && (
        <div className="absolute bottom-[130px] left-3 right-3 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50">
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform p-1">{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* TIP BAR */}
      {user && (
        <div className="bg-black/30 border-t border-white/5 p-2 flex gap-2 overflow-x-auto scrollbar-none items-center justify-center shrink-0">
          <button onClick={() => sendTip(5)} className="flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap">
            <Gift size={14} /> $5
          </button>
          <button onClick={() => sendTip(10)} className="flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap">
            <Gift size={14} /> $10
          </button>
          <button onClick={handleCustomTip} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap">
            Custom
          </button>
        </div>
      )}

      {user ? (
        <form onSubmit={sendMessage} className="p-3 bg-black/40 border-t border-white/10 flex gap-2 items-center shrink-0 z-50 w-full overflow-hidden">
          <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="p-2 text-white/50 hover:text-white transition-colors"><Smile size={20} /></button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white outline-none focus:border-[#E53945]/50 transition placeholder:text-white/30"
          />
          <button type="submit" disabled={!newMessage.trim() || sending} className="w-10 h-10 rounded-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 flex items-center justify-center transition flex-shrink-0 shadow-lg shadow-[#E53945]/20">
            <Send size={16} className="text-white ml-0.5" />
          </button>
        </form>
      ) : (
        <div className="p-4 bg-black/40 border-t border-white/10 text-center text-sm text-white/50 shrink-0">Please log in to join the chat.</div>
      )}
    </div>
  );
}
