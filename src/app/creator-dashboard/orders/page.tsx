"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle2, Truck } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

export default function CreatorOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      const user = await getCachedUser();
      if (!user) return;

      const supabase = createClient();
      const { data: profile } = await supabase.from("profiles").select("creator_id").eq("user_id", user.id).single();

      if (profile?.creator_id) {
        const url = "/api/creator/orders?creatorId=" + profile.creator_id;
        const res = await fetch(url);
        const data = await res.json();
        setOrders(data.orders || []);
      }
      setLoading(false);
    }
    loadOrders();
  }, []);

  const handleShip = async (orderId: string) => {
    const trackingNumber = trackingInputs[orderId];
    if (!trackingNumber || !trackingNumber.trim()) return alert("Please enter a tracking number first.");

    setUpdating(orderId);
    try {
      const res = await fetch("/api/creator/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, trackingNumber: trackingNumber.trim() })
      });
      if (!res.ok) throw new Error("Failed to update");

      setOrders(function(prev) { return prev.map(function(o) { return o.id === orderId ? { ...o, status: "shipped", tracking_number: trackingNumber.trim() } : o; }); });
      alert("Order marked as shipped!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black">Manage Orders</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
            <Package size={48} className="mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No orders yet</h3>
            <p className="text-white/50 text-sm">When someone buys your merch, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(function(order) { return (
              <div key={order.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex items-center gap-4 shrink-0">
                    <img src={order.product_image} alt={order.product_name} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                    <div>
                      <p className="text-sm text-white/50 font-bold uppercase tracking-wider mb-1">Item</p>
                      <h3 className="text-lg font-bold text-white leading-tight">{order.product_name}</h3>
                      <p className="text-[#1DB954] font-black">{"$" + (order.amount_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex-1 bg-black/40 rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Truck size={12} /> Shipping Details
                    </p>
                    <p className="text-sm font-bold">{order.shipping_name}</p>
                    <p className="text-sm text-white/70">{order.shipping_address}</p>
                    <p className="text-sm text-white/70">{order.shipping_city}, {order.shipping_postal_code}</p>
                    <p className="text-sm text-white/70">{order.shipping_country}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/50">Status:</span>
                    <span className={"px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider " + (order.status === "shipped" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                      {order.status}
                    </span>
                  </div>

                  {order.status === "paid" ? (
                    <div className="flex w-full md:w-auto items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter Tracking #" 
                        value={trackingInputs[order.id] || ""}
                        onChange={function(e) { setTrackingInputs(function(prev) { return { ...prev, [order.id]: e.target.value }; }); }}
                        className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E53945]"
                      />
                      <button 
                        onClick={function() { handleShip(order.id); }}
                        disabled={updating === order.id}
                        className="bg-[#E53945] hover:bg-[#d12e39] text-white font-bold text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {updating === order.id ? "Saving..." : "Mark Shipped"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
                      <CheckCircle2 size={16} className="text-green-400" />
                      <span className="text-sm font-bold text-green-400">Tracking: {order.tracking_number}</span>
                    </div>
                  )}
                </div>
              </div>
            ); })}
          </div>
        )}
      </div>
    </main>
  );
}