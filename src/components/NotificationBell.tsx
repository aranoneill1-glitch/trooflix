"use client";

import { useState, useEffect } from "react";
import { Bell, X, Trash2, CheckCircle2, Heart, MessageCircle, UserPlus, ShoppingBag, Plus, Minus, Settings, Repeat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

type Notification = {
  id: string;
  type: "like" | "comment" | "follow" | "system";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_avatar: string | null;
};

export default function NotificationBell({ hideTrigger = false }: { hideTrigger?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"unread" | "all" | "basket">("all");
  const [basketItems, setBasketItems] = useState<any[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-notifications', handleOpen);
    return () => window.removeEventListener('open-notifications', handleOpen);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("trooflix_basket");
    if (stored) {
      try { setBasketItems(JSON.parse(stored)); } catch {}
    }
  }, [isOpen]);

  const updateQuantity = (id: number, delta: number) => {
    const updated = basketItems.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item);
    setBasketItems(updated);
    localStorage.setItem("trooflix_basket", JSON.stringify(updated));
  };

  const removeBasketItem = (id: number) => {
    const updated = basketItems.filter(item => item.id !== id);
    setBasketItems(updated);
    localStorage.setItem("trooflix_basket", JSON.stringify(updated));
  };

  const handleCheckout = async () => {
    if (basketItems.length === 0) return;
    setCheckoutLoading(true);
    
    try {
      const user = await getCachedUser();
      if (!user) {
        alert("Please log in to checkout.");
        setCheckoutLoading(false);
        return;
      }

      const items = basketItems.map(item => ({ id: item.id, quantity: item.quantity }));
      const res = await fetch("/api/stripe/merch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, items })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert("Checkout error: " + err.message);
      setCheckoutLoading(false);
    }
  };

  const totalPrice = basketItems.reduce((acc, item) => acc + (item.price_cents * item.quantity), 0) / 100;

  useEffect(() => {
    async function fetchNotifications() {
      const user = await getCachedUser();
      if (!user) return;

      try {
        const res = await fetch("/api/notifications?userId=" + user.id);
        const json = await res.json();
        const data = json.notifications || [];
        setNotifications(data);
      } catch (e) {
        console.error("[NotificationBell] Fetch failed:", e);
      }
      setLoading(false);
    }
    fetchNotifications();
  }, [supabase]);

  const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;
  const displayedNotifications = activeTab === "unread" ? notifications.filter((n: Notification) => !n.is_read) : notifications;

  const markAllRead = async () => {
    const user = await getCachedUser();
    if (!user) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    // Database update
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  // Group by Date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped = {
    Today: displayedNotifications.filter(n => new Date(n.created_at).toDateString() === today.toDateString()),
    Yesterday: displayedNotifications.filter(n => new Date(n.created_at).toDateString() === yesterday.toDateString()),
    Older: displayedNotifications.filter(n => new Date(n.created_at) < yesterday && new Date(n.created_at).toDateString() !== yesterday.toDateString()),
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <>
      {!hideTrigger && (
        <button onClick={() => setIsOpen(true)} className="relative p-2 text-white/70 hover:text-white transition">
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E53945] rounded-full border-2 border-[#0a0303]" />
          )}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed top-[64px] left-0 right-0 bottom-0 z-[190] bg-[#0a0303] text-white flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0303]/90 backdrop-blur-md shrink-0">
              <button onClick={() => setIsOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
                <X size={20} />
              </button>
              <h1 className="text-xl font-bold tracking-tight">Notification center</h1>
              <div className="w-10" /> {/* Spacer for symmetry */}
            </div>

            {/* Segmented Control */}
            <div className="flex justify-center mt-6 shrink-0">
              <div className="flex bg-[#1c1c1e] p-1 rounded-full border border-white/5">
                <button 
                  onClick={() => setActiveTab("all")} 
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "all" ? "bg-[#E53945] text-white shadow-lg" : "text-white/50 hover:text-white"}`}
                >
                  All ({notifications.length})
                </button>
                <button 
                  onClick={() => setActiveTab("unread")} 
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "unread" ? "bg-[#E53945] text-white shadow-lg" : "text-white/50 hover:text-white"}`}
                >
                  Unread ({unreadCount})
                </button>
                <button 
                  onClick={() => setActiveTab("basket")} 
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "basket" ? "bg-[#E53945] text-white shadow-lg" : "text-white/50 hover:text-white"}`}
                >
                  Basket ({basketItems.length})
                </button>

              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
              {activeTab === "basket" ? (
                <div className="space-y-4">
                  {basketItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-white/30 py-20">
                      <ShoppingBag size={48} className="mb-4 opacity-50" />
                      <p className="text-lg font-bold">Your basket is empty</p>
                      <p className="text-sm mt-1">Add items from the shop to see them here.</p>
                    </div>
                  ) : (
                    <>
                      {basketItems.map((item) => (
                        <div key={item.id} className="bg-[#1c1c1e] border border-white/5 p-4 rounded-2xl flex items-center gap-3">
                          <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{item.name}</p>
                            <p className="text-xs text-white/50">${(item.price_cents / 100).toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                              <Plus size={12} />
                            </button>
                            <button onClick={() => removeBasketItem(item.id)} className="ml-1 p-1.5 text-white/40 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="mt-6 p-4 bg-[#1c1c1e] border border-white/5 rounded-2xl">
                        <div className="flex justify-between items-center mb-4 text-lg font-bold">
                          <span>Total</span>
                          <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <button onClick={handleCheckout} disabled={checkoutLoading} className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50">
                          {checkoutLoading ? "Redirecting to Stripe..." : "Checkout"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>
              ) : displayedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30">
                  <Bell size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-bold">You're all caught up!</p>
                  <p className="text-sm mt-1">No {activeTab} notifications to show.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([groupName, items]) => items.length > 0 && (
                  <div key={groupName} className="space-y-3">
                    <div className="flex justify-between items-end px-2">
                      <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider">{groupName}</h3>
                      {groupName === "Today" && unreadCount > 0 && activeTab === "unread" && (
                        <button onClick={markAllRead} className="text-xs font-bold text-[#E53945] hover:text-[#d12e39]">Mark all read</button>
                      )}
                    </div>

                    {items.map(n => (
                      <div key={n.id} className="bg-[#1c1c1e] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-start gap-4 transition-all group relative overflow-hidden">
                        
                        {/* Icon / Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[#0a0303] flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                          {n.sender_avatar ? (
                            <img src={n.sender_avatar} alt="" className="w-full h-full object-cover" />
                          ) : n.type === "like" ? (
                            <Heart size={18} className="text-[#E53945]" fill="currentColor" />
                          ) : n.type === "comment" ? (
                            <MessageCircle size={18} className="text-blue-400" />
                          ) : n.type === "follow" ? (
                            <UserPlus size={18} className="text-green-400" />
                          ) : (
                            <Bell size={18} className="text-white/50" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex justify-between items-start gap-4">
                            <h4 className={`text-base font-bold truncate ${n.is_read ? "text-white/70" : "text-white"}`}>
                              {n.title}
                            </h4>
                            <span className="text-xs text-white/40 shrink-0">{formatTime(n.created_at)}</span>
                          </div>
                          <p className="text-sm text-white/50 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        </div>

                        {/* Delete Action (Visible on Hover) */}
                        <button onClick={() => deleteNotification(n.id)} className="absolute right-4 bottom-4 p-2 text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}

              {displayedNotifications.length > 0 && (
                <div className="text-center text-white/30 text-sm py-8">
                  There are no more recent notifications to see
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
