"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Package, CheckCircle, Truck, Loader2, ShoppingBag, Store } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Order = {
  id: number;
  amount_cents: number;
  status: string;
  shipping_name?: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  tracking_number?: string;
  shipping_carrier?: string;
  created_at: string;
  order_code: string;
  product: { name: string; image_url: string } | null;
  creator_name?: string;
};

function OrdersContent() {
  const [activeTab, setActiveTab] = useState<"bought" | "sold">("bought");
  const [boughtOrders, setBoughtOrders] = useState<Order[]>([]);
  const [soldOrders, setSoldOrders] = useState<Order[]>([]);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const pollCount = useRef(0);
  const searchParams = useSearchParams();
  const justPurchased = searchParams.get("purchased") === "1";
  const initialTab = searchParams.get("tab");

  useEffect(() => {
    if (initialTab === "sold") setActiveTab("sold");
  }, [initialTab]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchBought = async () => {
      const user = await getCachedUser();
      if (!user) return;
      try {
        const r = await fetch(`/api/user/orders?userId=${user.id}&t=${Date.now()}`, { cache: "no-store" });
        const d = await r.json();
        const list = d.orders || [];
        setBoughtOrders(list);
        setLoading(false);

        if (justPurchased && pollCount.current < 15 && list.length === 0) {
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

    const fetchSold = async () => {
      const user = await getCachedUser();
      if (!user) return;
      try {
        const cr = await fetch(`/api/me/creator?user_id=${user.id}`).then((r) => r.json());
        const creatorId = cr.creator?.id;
        if (!creatorId) { setLoading(false); return; }
        const r = await fetch(`/api/creator/orders?creatorId=${creatorId}&t=${Date.now()}`, { cache: "no-store" });
        const d = await r.json();
        setSoldOrders(d.orders || []);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchBought();
    fetchSold();

    if (justPurchased) {
      setSyncing(true);
      intervalId = setInterval(fetchBought, 2000);
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [justPurchased]);

  const handleShip = async (orderId: number) => {
    const trackingNumber = trackingInputs[orderId];
    const shippingCarrier = carrierInputs[orderId] || "UPS";
    if (!trackingNumber || !trackingNumber.trim()) return alert("Please enter a tracking number first.");

    setUpdating(String(orderId));
    try {
      const res = await fetch("/api/creator/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, trackingNumber: trackingNumber.trim(), shippingCarrier }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setSoldOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status: "shipped", tracking_number: trackingNumber.trim(), shipping_carrier: shippingCarrier } : o)
      );
      alert("Order marked as shipped!");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-8 text-center">Loading…</div>;

  const shownOrders = activeTab === "bought" ? boughtOrders : soldOrders;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 max-w-4xl mx-auto">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to profile
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">My Orders</h1>
          <p className="text-white/50 text-sm">
            {activeTab === "bought" ? "Track your merch purchases." : "Manage your merch sales and shipping."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/merchandise" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full transition border border-white/10">
            <ShoppingBag size={14} /> Visit Marketplace
          </Link>
          {syncing && (
            <div className="flex items-center gap-2 text-xs text-yellow-500 font-semibold bg-yellow-500/10 px-3 py-1.5 rounded-lg animate-pulse">
            <Loader2 size={14} className="animate-spin" /> Syncing your order...
          </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/5">
        <button
          onClick={() => setActiveTab("bought")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition border-b-2 ${activeTab === "bought" ? "text-white border-[#E53945]" : "text-white/50 border-transparent hover:text-white"}`}
        >
          <ShoppingBag size={16} /> Bought ({boughtOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("sold")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition border-b-2 ${activeTab === "sold" ? "text-white border-[#E53945]" : "text-white/50 border-transparent hover:text-white"}`}
        >
          <Store size={16} /> Sold ({soldOrders.length})
        </button>
      </div>

      <div className="space-y-4">
        {shownOrders.length === 0 ? (
          <div className="text-center py-16 bg-[#141418] border border-white/5 rounded-xl">
            <Package size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/50 text-sm">
              {activeTab === "bought" ? "You haven't ordered anything yet." : "You haven't sold anything yet."}
            </p>
          </div>
        ) : (
          shownOrders.map((o) => (
            <div key={o.id} className="bg-[#141418] border border-white/5 rounded-xl p-5 flex flex-col md:flex-row gap-6">
              <div className="flex gap-4 flex-1">
                <div className="w-20 h-20 rounded-lg bg-black flex-shrink-0 overflow-hidden">
                  {o.product?.image_url ? (
                    <img src={o.product.image_url} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="m-auto text-white/20 mt-7" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">
                    {activeTab === "bought" ? `From ${o.creator_name || "Creator"}` : `Sold to customer`}
                  </p>
                  <h3 className="font-bold text-lg">{o.product?.name || "Unknown Product"}</h3>
                  <p className="text-white/60 text-sm">${(o.amount_cents / 100).toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-white/40">{new Date(o.created_at).toLocaleDateString()}</p>
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
                      <span className="font-mono text-emerald-400 font-semibold">{o.shipping_carrier ? `${o.shipping_carrier} - ` : ""}{o.tracking_number}</span>
                    </div>
                  )}
                </div>

                {activeTab === "sold" && o.status === "paid" && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <select
                      value={carrierInputs[o.id] || "UPS"}
                      onChange={(e) => setCarrierInputs((p) => ({ ...p, [o.id]: e.target.value }))}
                      className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#E53945]"
                    >
                      <option value="UPS">UPS</option>
                      <option value="FedEx">FedEx</option>
                      <option value="USPS">USPS</option>
                      <option value="DHL">DHL</option>
                      <option value="Royal Mail">Royal Mail</option>
                      <option value="Evri">Evri</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Tracking #"
                      value={trackingInputs[o.id] || ""}
                      onChange={(e) => setTrackingInputs((p) => ({ ...p, [o.id]: e.target.value }))}
                      className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-32 focus:outline-none focus:border-[#E53945]"
                    />
                    <button
                      onClick={() => handleShip(o.id)}
                      disabled={updating === String(o.id)}
                      className="bg-[#E53945] hover:bg-[#d12e39] text-white font-bold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {updating === String(o.id) ? "..." : "Ship"}
                    </button>
                  </div>
                )}

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
