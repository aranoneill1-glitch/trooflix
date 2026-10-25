"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Package, CheckCircle, Truck, Loader2 } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Order = {
  id: number; amount_cents: number; status: string; shipping_address: string; shipping_city: string; shipping_postal_code: string; shipping_country: string;
  tracking_number?: string; shipping_carrier?: string; created_at: string; order_code: string;
  product: { name: string; image_url: string } | null; creator_name: string;
};

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const pollCount = useRef(0);
  const searchParams = useSearchParams();
  const justPurchased = searchParams.get("purchased") === "1";

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchOrders = async () => {
      const user = await getCachedUser();
      if (!user) return;

      try {
        const r = await fetch(`/api/user/orders?userId=${user.id}&t=${Date.now()}`, { cache: "no-store" });
        const d = await r.json();
        const fetchedOrders = d.orders || [];
        
        setOrders(fetchedOrders);
        setLoading(false);

        // If they just bought something and it's not here yet, keep polling
        if (justPurchased && pollCount.current < 15 && fetchedOrders.length === 0) {
          setSyncing(true);
          pollCount.current += 1;
        } else {
          setSyncing(false);
          if (intervalId) clearInterval(intervalId);
        }
      } catch {
        setLoading(false);
      }
    };

    fetchOrders();

    // Poll every 2 seconds (up to 30 seconds) if they just purchased
    if (justPurchased) {
      setSyncing(true);
      intervalId = setInterval(fetchOrders, 2000);
    }

    return () => clearInterval(intervalId);
  }, [justPurchased]);

  if (loading) return <div className="min-h-screen bg-black text-white p-8 text-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 max-w-4xl mx-auto">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to profile
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">My Orders</h1>
          <p className="text-white/50 text-sm">Track your merch purchases.</p>
        </div>
        
        {syncing && (
          <div className="flex items-center gap-2 text-xs text-yellow-500 font-semibold bg-yellow-500/10 px-3 py-1.5 rounded-lg animate-pulse">
            <Loader2 size={14} className="animate-spin" /> Syncing your order...
          </div>
        )}
      </div>

      <div className="space-y-4">
        {orders.length === 0 && !syncing ? (
          <div className="text-center py-16 bg-[#141418] border border-white/5 rounded-xl">
            <Package size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/50 text-sm">You haven't ordered anything yet.</p>
          </div>
        ) : (
          orders.map(o => (
            <div key={o.id} className="bg-[#141418] border border-white/5 rounded-xl p-5 flex flex-col md:flex-row gap-6">
              
              <div className="flex gap-4 flex-1">
                <div className="w-20 h-20 rounded-lg bg-black flex-shrink-0 overflow-hidden">
                  {o.product?.image_url ? <img src={o.product.image_url} className="w-full h-full object-cover" /> : <Package size={24} className="m-auto text-white/20 mt-7" />}
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">From {o.creator_name}</p>
                  <h3 className="font-bold text-lg">{o.product?.name || "Unknown Product"}</h3>
                  <p className="text-white/60 text-sm">${(o.amount_cents / 100).toFixed(2)}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-white/40">Ordered on {new Date(o.created_at).toLocaleDateString()}</p>
                    <span className="text-[10px] font-mono font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded">{o.order_code}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end justify-between border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                <div className="mb-4 md:mb-0 text-right">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${o.status === "shipped" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    {o.status === "shipped" ? <><Truck size={14} /> Shipped</> : <><CheckCircle size={14} /> Processing</>}
                  </span>
                  {o.tracking_number && (
                    <div className="mt-2 text-xs">
                      <span className="text-white/40">Tracking: </span>
                      <span className="font-mono text-emerald-400 font-semibold">{o.shipping_carrier ? `${o.shipping_carrier} - ` : ''}{o.tracking_number}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-white/70 md:text-right mt-3">
                  <p className="font-semibold text-white/90">Shipping to:</p>
                  <p>{o.shipping_address}</p>
                  <p>{o.shipping_city}, {o.shipping_postal_code}</p>
                  <p>{o.shipping_country}</p>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MyOrders() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white p-8 text-center">Loading…</div>}>
      <OrdersContent />
    </Suspense>
  );
}
