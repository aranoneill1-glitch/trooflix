"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, Power, Search, Ticket, Copy, CheckCircle, XCircle, Calendar, Users } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  grants_tier: "plus" | "creator";
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
};

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTier, setNewTier] = useState<"plus" | "creator">("creator");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const loadCodes = () => {
    setLoading(true);
    fetch(`/api/admin/promo-codes?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCodes(d.codes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCodes(); }, []);

  const handleCreate = async () => {
    setError("");
    if (!newCode.trim()) return setError("Enter a code");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          grants_tier: newTier,
          max_uses: newMaxUses ? Number(newMaxUses) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create"); return; }
      setShowCreate(false);
      setNewCode("");
      setNewMaxUses("");
      loadCodes();
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c)));
    try {
      await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
    } catch {
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: current } : c)));
    }
  };

  const deleteCode = async (id: string, code: string) => {
    if (!confirm(`Delete "${code}"? This cannot be undone.`)) return;
    setCodes((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
    } catch {
      loadCodes();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return codes;
    const q = search.toLowerCase();
    return codes.filter((c) => c.code.toLowerCase().includes(q) || c.grants_tier.toLowerCase().includes(q));
  }, [codes, search]);

  const stats = useMemo(() => {
    const total = codes.length;
    const active = codes.filter((c) => c.is_active).length;
    const totalRedemptions = codes.reduce((sum, c) => sum + c.current_uses, 0);
    return { total, active, totalRedemptions };
  }, [codes]);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black mb-1">Promo Codes</h1>
          <p className="text-white/50 text-sm">Create free-tier access codes</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm">
          <Plus size={16} /> New Code
        </button>
      </div>

      {/* STATS */}
      <section className="mb-6">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <StatCard icon={Ticket} label="Total Codes" value={stats.total} />
          <StatCard icon={CheckCircle} label="Active" value={stats.active} />
          <StatCard icon={Users} label="Redemptions" value={stats.totalRedemptions} />
        </div>
      </section>

      {/* SEARCH */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        <input
          type="text"
          placeholder="Search by code or tier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#141418] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-red-600/40 transition"
        />
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#141418] border border-white/5 rounded-2xl">
          <Ticket size={48} className="mx-auto text-white/20 mb-3" />
          <p className="text-white/50 text-sm">No promo codes yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className={`bg-[#141418] border rounded-xl p-4 flex items-center gap-4 transition ${c.is_active ? "border-white/5" : "border-white/5 opacity-50"}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.grants_tier === "creator" ? "bg-yellow-500/20" : "bg-red-600/20"}`}>
                <Ticket size={20} className={c.grants_tier === "creator" ? "text-yellow-500" : "text-red-500"} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-mono font-bold text-white text-sm tracking-wider">{c.code}</p>
                  <button onClick={() => copyCode(c.code)} className="p-1 text-white/30 hover:text-white transition">
                    {copied === c.code ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${c.grants_tier === "creator" ? "bg-yellow-500/20 text-yellow-500" : "bg-red-600/20 text-red-500"}`}>
                    {c.grants_tier === "creator" ? "Creator" : "Plus"}
                  </span>
                  <span>Used: {c.current_uses}{c.max_uses !== null ? `/${c.max_uses}` : ""}</span>
                  <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(c.id, c.is_active)}
                  className={`p-2 rounded-lg transition ${c.is_active ? "text-green-500 hover:bg-green-500/10" : "text-white/30 hover:bg-white/5"}`}
                  title={c.is_active ? "Disable" : "Enable"}
                >
                  {c.is_active ? <Power size={16} /> : <XCircle size={16} />}
                </button>
                <button
                  onClick={() => deleteCode(c.id, c.code)}
                  className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-4">Create Promo Code</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wider">Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LAUNCH2024"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white uppercase tracking-wider font-mono focus:outline-none focus:border-red-600/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wider">Grants Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTier("plus")}
                    className={`py-2.5 rounded-lg font-bold text-sm transition border ${newTier === "plus" ? "bg-red-600/20 border-red-600 text-red-500" : "bg-white/5 border-white/10 text-white/50"}`}
                  >
                    Plus
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTier("creator")}
                    className={`py-2.5 rounded-lg font-bold text-sm transition border ${newTier === "creator" ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : "bg-white/5 border-white/10 text-white/50"}`}
                  >
                    Creator
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5 uppercase tracking-wider">Max Uses (blank = unlimited)</label>
                <input
                  type="number"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="∞"
                  min="1"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-600/40"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-lg transition">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition">
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 md:p-4 bg-[#141418] border border-white/5">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} className="text-white/40" />
        <p className="text-[10px] md:text-[11px] font-semibold tracking-wide text-white/50 uppercase truncate">{label}</p>
      </div>
      <p className="text-2xl md:text-3xl font-black text-white tabular-nums leading-none">{value}</p>
    </div>
  );
}