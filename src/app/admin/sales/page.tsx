"use client";

import { useEffect, useState, useMemo } from "react";
import { ShoppingBag, Search, DollarSign, Truck, Clock, ArrowUpRight, CheckCircle } from "lucide-react";

type SaleOrder = {
  id: number;
  order_code: string;
  created_at: string;
  status: string;
  amount_cents: number;
  platform_fee_cents: number;
  creator_payout_cents: number;
  creator_name: string;
  tracking_number?: string;
  shipping_carrier?: string;
  product: { name: string; image_url: string } | null;
};

export default function AdminSalesPage() {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hold" | "ready">("all");

  useEffect(() => {
    fetch("/api/admin/sales")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let pendingPayouts = 0;
    let readyPayouts = 0;

    orders.forEach((o) => {
      gross += o.amount_cents;
      fees += o.platform_fee_cents;
      
      if (o.status === "shipped") {
        readyPayouts += o.creator_payout_cents;
      } else {
        pendingPayouts += o.creator_payout_cents;
      }
    });

    return { gross, fees, pendingPayouts, readyPayouts };
  }, [orders]);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.order_code.toLowerCase().includes(search.toLowerCase()) ||
      o.creator_name.toLowerCase().includes(search.toLowerCase()) ||
      o.product?.name.toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filter === "hold") return o.status !== "shipped";
    if (filter === "ready") return o.status === "shipped";
    return true;
  });

  const pendingCount = orders.filter(o => o.status !== "shipped").length;
  const readyCount = orders.filter(o => o.status === "shipped").length;

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <p className="text-white/40 text-sm font-medium">Loading Sales…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-1">Platform Sales</h1>
        <p className="text-white/50 text-sm">Track gross revenue, platform fees, and creator payouts.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-[#0f0f12] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <DollarSign size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Total Gross</span>
          </div>
          <p className="text-2xl font-black">{formatMoney(stats.gross)}</p>
        </div>
        
        <div className="bg-[#0f0f12] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <ArrowUpRight size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Platform (10%)</span>
          </div>
          <p className="text-2xl font-black text-red-400">{formatMoney(stats.fees)}</p>
        </div>

        <div className="bg-[#0f0f12] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <Clock size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">On Hold</span>
          </div>
          <p className="text-2xl font-black text-yellow-400">{formatMoney(stats.pendingPayouts)}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase">Unshipped Orders</p>
        </div>

        <div className="bg-[#0f0f12] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Truck size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Ready to Pay</span>
          </div>
          <p className="text-2xl font-black text-green-400">{formatMoney(stats.readyPayouts)}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase">Shipped Orders</p>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order code, creator, or product..."
            className="w-full bg-[#0f0f12] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-red-500 transition placeholder:text-white/30"
          />
        </div>

        <div className="flex bg-[#0f0f12] border border-white/5 rounded-xl p-1 w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${filter === "all" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter("hold")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${filter === "hold" ? "bg-yellow-500/20 text-yellow-400" : "text-white/50 hover:text-white"}`}
          >
            <Clock size={14} /> On Hold ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("ready")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${filter === "ready" ? "bg-green-500/20 text-green-400" : "text-white/50 hover:text-white"}`}
          >
            <Truck size={14} /> Ready to Pay ({readyCount})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-[#0f0f12] border border-white/5 rounded-3xl">
            <ShoppingBag size={40} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 text-sm">No sales found for this filter.</p>
          </div>
        ) : (
          filtered.map((o) => {
            const isShipped = o.status === "shipped";
            return (
              <div key={o.id} className="bg-[#0f0f12] border border-white/[0.06] hover:border-white/10 rounded-2xl p-4 md:p-5 transition">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  {/* Left: Product & Creator */}
                  <div className="flex gap-4 flex-1">
                    <div className="w-14 h-14 rounded-lg bg-black flex-shrink-0 overflow-hidden">
                      {o.product?.image_url ? (
                        <img src={o.product.image_url} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="m-auto text-white/20 mt-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white/90">{o.product?.name || "Unknown"}</h3>
                        <span className="text-[10px] font-mono font-bold bg-white/10 text-white/60 px-2 py-0.5 rounded">
                          {o.order_code}
                        </span>
                      </div>
                      <p className="text-xs text-white/50">
                        Creator: <span className="text-white/80 font-semibold">{o.creator_name}</span>
                      </p>
                      <p className="text-[11px] text-white/30 mt-1">
                        {new Date(o.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Financials */}
                  <div className="flex items-center gap-6 md:border-l md:border-white/5 md:pl-6">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Gross</p>
                      <p className="text-sm font-bold text-white">{formatMoney(o.amount_cents)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Fee (10%)</p>
                      <p className="text-sm font-bold text-red-400">+{formatMoney(o.platform_fee_cents)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Creator (90%)</p>
                      <p className="text-sm font-bold text-white/80">-{formatMoney(o.creator_payout_cents)}</p>
                    </div>
                  </div>

                  {/* Right: Status */}
                  <div className="md:text-right shrink-0">
                    {isShipped ? (
                      <div className="inline-flex flex-col items-start md:items-end">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20 mb-1">
                          <CheckCircle size={14} /> Ready to Pay
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {o.shipping_carrier} - {o.tracking_number}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-start md:items-end">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 mb-1">
                          <Clock size={14} /> Hold (Unshipped)
                        </span>
                        <span className="text-[10px] text-white/40">Waiting for seller to ship</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
