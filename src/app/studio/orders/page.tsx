"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Package, CheckCircle, Clock, Truck } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Order = {
  id: number;
  amount_cents: number;
  status: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  created_at: string;
  order_code: string;
  product: {
    name: string;
    image_url: string;
  } | null;
};

export default function StudioOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = async () => {
    const user = await getCachedUser();
    if (!user) return;
    
    const cRes = await fetch(`/api/me/creator?user_id=${user.id}`);
    const cData = await cRes.json();
    
    if (cData.creator && cData.creator.id) {
      const oRes = await fetch(`/api/creator/orders?creatorId=${cData.creator.id}`);
      const oData = await oRes.json();
      setOrders(oData.orders || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markShipped = async (orderId: number) => {
    setUpdating(orderId);
    await fetch("/api/creator/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "shipped" }),
    });
    await load();
    setUpdating(null);
  };

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition">
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <h1 className="text-2xl font-black mb-1">Your Orders</h1>
      <p className="text-white/50 text-sm mb-6">
        Manage merch purchases and shipping addresses.
      </p>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-[#141418] border border-white/5 rounded-xl">
            <Package size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/50 text-sm">No orders yet. Share your shop to get sales!</p>
          </div>
        ) : (
          orders.map(o => (
            <div key={o.id} className="bg-[#141418] border border-white/5 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                {/* Left Side: Product and Buyer */}
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-black flex-shrink-0 overflow-hidden">
                    {o.product?.image_url ? (
                      <img src={o.product.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="m-auto text-white/20 mt-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{o.product?.name || "Unknown Product"}</h3>
                      <span className="text-[10px] font-mono font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded">
                        {o.order_code}
                      </span>
                    </div>
                    <p className="text-green-400 font-semibold">${(o.amount_cents / 100).toFixed(2)}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(o.created_at).toLocaleDateString()} at {new Date(o.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Right Side: Status and Action */}
                <div className="flex items-center gap-3">
                  {o.status === "shipped" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
                      <CheckCircle size={14} /> Shipped
                    </span>
                  ) : (
                    <button
                      onClick={() => markShipped(o.id)}
                      disabled={updating === o.id}
                      className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      <Truck size={14} /> {updating === o.id ? "Saving..." : "Mark as Shipped"}
                    </button>
                  )}
                </div>
              </div>

              {/* Shipping Address Box */}
              <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/5 flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Ship To:</p>
                  <p className="text-sm font-semibold text-white/90">{o.shipping_name}</p>
                  <p className="text-sm text-white/70">{o.shipping_address}</p>
                  <p className="text-sm text-white/70">{o.shipping_city}, {o.shipping_postal_code}</p>
                  <p className="text-sm text-white/70">{o.shipping_country}</p>
                </div>
                <div className="md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
                  <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Receipt Code</p>
                  <p className="font-mono text-sm text-white/80">{o.order_code}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
