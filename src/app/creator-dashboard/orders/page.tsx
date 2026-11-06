"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle2 } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

export default function CreatorOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<string, string>>({});
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
    const shippingCarrier = carrierInputs[orderId] || "UPS";

    if (!trackingNumber || !trackingNumber.trim()) return alert("Please enter a tracking number first.");

    setUpdating(orderId);
    try {
      const res = await fetch("/api/creator/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, trackingNumber: trackingNumber.trim(), shippingCarrier })
      });
      if (!res.ok) throw new Error("Failed to update");

      setOrders(function(prev) { return prev.map(function(o) { return o.id === orderId ? { ...o, status: "shipped", tracking_number: trackingNumber.trim(), shipping_carrier: shippingCarrier } : o; }); });
      alert("Order marked as shipped!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-10">
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
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold text-white/50 uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Item</div>
              <div className="col-span-3">Customer & Shipping</div>
              <div className="col-span-4 text-right">Status & Action</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/5">
              {orders.map(function(order) { return (
                <div key={order.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors">
                  
                  {/* Date */}
                  <div className="col-span-2 text-sm text-white/60 font-medium">
                    {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>

                  {/* Item */}
                  <div className="col-span-3 flex items-center gap-3">
                    <img src={order.product_image} alt={order.product_name} className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{order.product_name}</p>
                      <p className="text-xs text-[#1DB954] font-bold">{"$" + (order.amount_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Shipping */}
                  <div className="col-span-3 text-sm">
                    <p className="font-bold text-white/90">{order.shipping_name}</p>
                    <p className="text-xs text-white/50 truncate">{order.shipping_address}</p>
                    <p className="text-xs text-white/50">{order.shipping_city}, {order.shipping_postal_code}</p>
                    <p className="text-xs text-white/50">{order.shipping_country}</p>
                  </div>

                  {/* Status & Action */}
                  <div className="col-span-4 flex flex-col items-start md:items-end gap-2">
                    {order.status === "paid" ? (
                      <div className="flex flex-wrap md:flex-nowrap w-full md:w-auto items-center gap-2">
                        <select 
                          value={carrierInputs[order.id] || "UPS"} 
                          onChange={function(e) { setCarrierInputs(function(prev) { return { ...prev, [order.id]: e.target.value }; }); }}
                          className="w-full md:w-auto bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#E53945]"
                        >
                          <option value="UPS">UPS</option>
                          <option value="FedEx">FedEx</option>
                          <option value="USPS">USPS</option>
                          <option value="DHL">DHL</option>
                          <option value="Royal Mail">Royal Mail</option>
                          <option value="Evri">Evri</option>
                          <option value="Other">Other</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Tracking #" 
                          value={trackingInputs[order.id] || ""}
                          onChange={function(e) { setTrackingInputs(function(prev) { return { ...prev, [order.id]: e.target.value }; }); }}
                          className="w-full md:w-28 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#E53945]"
                        />
                        <button 
                          onClick={function() { handleShip(order.id); }}
                          disabled={updating === order.id}
                          className="bg-[#E53945] hover:bg-[#d12e39] text-white font-bold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50 shrink-0"
                        >
                          {updating === order.id ? "..." : "Ship"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start md:items-end gap-1">
                        <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-md border border-green-500/20">
                          <CheckCircle2 size={14} />
                          <span className="text-xs font-bold uppercase tracking-wide">Shipped</span>
                        </div>
                        <span className="text-[10px] text-white/50 font-bold">{order.shipping_carrier || "Carrier"}</span>
                        <span className="text-[10px] text-white/40 font-mono">{order.tracking_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              ); })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}