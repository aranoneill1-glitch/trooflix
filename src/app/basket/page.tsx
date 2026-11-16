"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";

type BasketItem = {
  id: number;
  name: string;
  image_url: string;
  price_cents: number;
  creatorName?: string;
  quantity: number;
};

const BASKET_KEY = "trooflix_basket";

export default function BasketPage() {
  const router = useRouter();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [ready, setReady] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [shipping, setShipping] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BASKET_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
    setReady(true);
  }, []);

  const persist = (next: BasketItem[]) => {
    setItems(next);
    localStorage.setItem(BASKET_KEY, JSON.stringify(next));
  };

  const changeQuantity = (id: number, delta: number) => {
    const next = items
      .map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item);
    persist(next);
  };

  const removeItem = (id: number) => {
    persist(items.filter((item) => item.id !== id));
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.price_cents || 0) * (item.quantity || 1), 0) / 100,
    [items]
  );

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 1), 0),
    [items]
  );

  const checkout = async () => {
    setError("");
    if (items.length === 0) return;
    if (!shipping.name || !shipping.address || !shipping.city || !shipping.postalCode || !shipping.country) {
      setError("Please fill in all shipping details.");
      return;
    }

    setCheckingOut(true);
    try {
      const user = await getCachedUser();
      if (!user) { router.push("/login"); return; }

      const orders: string[] = [];
      for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
          const res = await fetch("/api/wallet/buy-merch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, productId: item.id, shipping }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (orders.length > 0) {
              setError(`Placed ${orders.length} item(s), then failed: ${data.error || "Purchase failed"}. Check your orders.`);
              persist(items.slice(items.findIndex((x) => x.id === item.id)));
              return;
            }
            throw new Error(data.error || "Purchase failed.");
          }
          orders.push(data.orderCode);
        }
      }

      localStorage.removeItem(BASKET_KEY);
      setItems([]);
      router.push("/orders");
    } catch (e: any) {
      setError(e?.message || "Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)]">
        <Link href="/merchandise" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Market
        </Link>

        <h1 className="text-3xl font-black tracking-tight mb-1">Your Basket</h1>
        <p className="text-sm text-white/50 mb-8">
          {totalUnits} item{totalUnits === 1 ? "" : "s"} · review quantities and check out with TrooCoins.
        </p>

        {!ready ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E53945]" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.04] border border-white/10 rounded-3xl">
            <ShoppingBag size={44} className="mx-auto text-white/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">Your basket is empty</h2>
            <p className="text-sm text-white/50 mb-6">Add something from the Creators Market.</p>
            <Link href="/merchandise" className="inline-flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-3 rounded-xl transition">
              Browse the market
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 bg-white/[0.04] border border-white/10 rounded-2xl p-3">
                  <img src={item.image_url} alt={item.name} className="w-20 h-24 object-cover rounded-xl bg-[#141418] shrink-0" />
                  <div className="flex-1 min-w-0">
                    {item.creatorName && (
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 truncate mb-0.5">{item.creatorName}</p>
                    )}
                    <h2 className="text-sm font-bold text-white truncate">{item.name}</h2>
                    <p className="text-sm font-black text-green-400 mt-1">${((item.price_cents || 0) / 100).toFixed(2)}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-2 py-1">
                        <button onClick={() => changeQuantity(item.id, -1)} aria-label="Decrease quantity" className="text-white/60 hover:text-white">
                          <Minus size={13} />
                        </button>
                        <span className="text-xs font-bold tabular-nums w-4 text-center">{item.quantity}</span>
                        <button onClick={() => changeQuantity(item.id, 1)} aria-label="Increase quantity" className="text-white/60 hover:text-white">
                          <Plus size={13} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} aria-label="Remove item" className="text-white/40 hover:text-red-400 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-black text-white shrink-0 self-start">
                    ${(((item.price_cents || 0) * (item.quantity || 1)) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <h2 className="text-lg font-black mb-4">Shipping details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["name", "address", "city", "postalCode", "country"] as const).map((field) => (
                  <input
                    key={field}
                    value={shipping[field]}
                    onChange={(e) => setShipping((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder={field === "postalCode" ? "Postal code" : field.charAt(0).toUpperCase() + field.slice(1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E53945] transition"
                  />
                ))}
              </div>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/60 text-sm">Subtotal</span>
                <span className="text-xl font-black text-white">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-white/40 mb-4">Paid with TrooCoins at checkout.</p>

              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}

              <button
                onClick={checkout}
                disabled={checkingOut}
                className="w-full flex items-center justify-center gap-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-60 text-white font-black py-4 rounded-xl transition"
              >
                {checkingOut ? <Loader2 size={18} className="animate-spin" /> : <ShoppingBag size={18} />}
                {checkingOut ? "Placing order..." : `Checkout · $${subtotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
