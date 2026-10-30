"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Save, Image as ImageIcon, Type, Palette, CheckCircle2 } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

const ACCENT_COLORS = [
  { name: "Trooflix Red", hex: "#E53945" },
  { name: "Electric Blue", hex: "#3B82F6" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Royal Purple", hex: "#8B5CF6" },
  { name: "Sunset Orange", hex: "#F59E0B" },
];

export default function CustomizeShopPage() {
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  // Settings State
  const [bannerUrl, setBannerUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState("#E53945");

  useEffect(() => {
    getCachedUser().then(async (user) => {
      if (!user) return;
      
      // Get the numeric creator ID to match the rest of the app
      const cr = await fetch(`/api/me/creator?user_id=${user.id}`).then(r => r.json());
      if (cr.creator) {
        setCreatorId(cr.creator.id);
        
        // Fetch existing settings
        const res = await fetch(`/api/creator/shop-settings?creatorId=${cr.creator.id}`);
        const data = await res.json();
        if (data.bannerUrl) setBannerUrl(data.bannerUrl);
        if (data.tagline) setTagline(data.tagline);
        if (data.accentColor) setAccentColor(data.accentColor);
      }
      setLoading(false);
    });
  }, []);

  const saveSettings = async () => {
    if (!creatorId) return;
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/creator/shop-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, bannerUrl, tagline, accentColor }),
      });
      
      if (res.ok) {
        setStatus({ type: "success", message: "Shop customized successfully!" });
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      setStatus({ type: "error", message: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-white/50 text-center">Loading settings...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto text-white pb-32">
      <Link href="/creator-dashboard/shop" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-8 transition">
        <ChevronLeft size={16} /> Back to Products
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Design Your Store</h1>
          <p className="text-sm text-white/50 max-w-xl">Make your shop unique to your brand. Update your banner, tagline, and custom accent color.</p>
        </div>
        <button 
          onClick={saveSettings} 
          disabled={saving}
          className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
        >
          <Save size={18} /> {saving ? "Saving..." : "Save Design"}
        </button>
      </div>

      {status.message && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${status.type === "success" ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-1 space-y-6">
          {/* Banner Input */}
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white/80">
              <ImageIcon size={16} /> Store Banner URL
            </label>
            <p className="text-xs text-white/40 pb-2">Paste a high-res image URL (1920x1080 recommended).</p>
            <input 
              type="text" 
              value={bannerUrl} 
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
            />
          </div>

          {/* Tagline Input */}
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white/80">
              <Type size={16} /> Store Tagline
            </label>
            <input 
              type="text" 
              value={tagline} 
              onChange={(e) => setTagline(e.target.value)}
              placeholder="The official store. Support my work."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
            />
          </div>

          {/* Accent Color Input */}
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-5 space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-white/80">
              <Palette size={16} /> Accent Color
            </label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setAccentColor(color.hex)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${accentColor === color.hex ? "ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1e]" : ""}`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {accentColor === color.hex && <CheckCircle2 size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <div className="lg:col-span-2">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="bg-white/5 px-4 py-2 text-xs font-bold text-white/40 uppercase tracking-widest text-center border-b border-white/10">
              Live Preview
            </div>
            
            {/* PREVIEW CONTENT */}
            <div className="relative">
              {/* Banner */}
              <div className="w-full h-48 md:h-64 bg-black relative">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">No Banner Image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-black/40 to-transparent" />
              </div>

              {/* Store Header info */}
              <div className="px-6 pb-6 -mt-12 relative z-10 text-center">
                <h2 className="text-3xl font-black mb-1">My Merch Store</h2>
                <p className="text-sm text-white/60 mb-6">{tagline || "The official store. Support my work."}</p>
                
                {/* Dummy Product Cards to show the accent color */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                      <div className="aspect-square bg-white/5" />
                      <div className="p-3">
                        <div className="h-4 w-3/4 bg-white/20 rounded mb-2" />
                        <div className="h-4 w-1/4 rounded" style={{ backgroundColor: accentColor }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8">
                  <span 
                    className="inline-block px-8 py-3 rounded-full text-white font-bold text-sm shadow-lg"
                    style={{ backgroundColor: accentColor }}
                  >
                    Buy Now
                  </span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
