"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Camera, Image as ImageIcon, Sparkles, User, DollarSign } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

const STEPS = [
  { id: 1, title: "Visuals", desc: "Brand your page." },
  { id: 2, title: "Identity", desc: "Tell your story." },
  { id: 3, title: "Monetization", desc: "Set your price." },
  { id: 4, title: "Done", desc: "You're ready." }
];

export default function CreatorWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("4.99");
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

  useEffect(() => {
    getCachedUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      // Pre-fill existing data if any
      fetch(`/api/profile?user_id=${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile) {
            setAvatarUrl(d.profile.avatar_url || "");
            setBannerUrl(d.profile.backdrop_url || "");
            setName(d.profile.display_name || "");
            setBio(d.profile.bio || "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const handleUpload = async (file: File, type: "avatar" | "banner") => {
    setUploading(type);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: type === "avatar" ? "avatars" : "backdrops" }),
      });
      const { signedUrl, publicUrl } = await presign.json();
      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      
      if (type === "avatar") setAvatarUrl(publicUrl);
      else setBannerUrl(publicUrl);
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const saveAndNext = async () => {
    // In a real scenario, we save the current step's data here
    if (currentStep === 1) {
      await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, avatarUrl, backdropUrl: bannerUrl }) });
    }
    if (currentStep === 2) {
      await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, displayName: name, bio }) });
    }
    if (currentStep === 3) {
      await fetch("/api/creator/premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, enabled: true, price_cents: Math.round(Number(price) * 100) }) });
    }
    
    if (currentStep < 4) setCurrentStep(currentStep + 1);
    else router.push("/studio");
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
      {/* Top Bar & Progress */}
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto flex items-center justify-between shrink-0">
        <button onClick={() => router.push("/studio")} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${currentStep >= s.id ? "w-8 bg-white" : "w-2 bg-white/20"}`} />
          ))}
        </div>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4 w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* STEP 1: VISUALS */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-5xl font-black mb-2">Brand your page.</h1>
                  <p className="text-white/50">Make a first impression that counts.</p>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Banner Image</label>
                  <label className="block border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-2xl overflow-hidden cursor-pointer transition bg-black/20 aspect-[3/1] relative group">
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "banner")} disabled={!!uploading} className="hidden" />
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                        <ImageIcon size={32} className="mb-2" />
                        <span>{uploading === "banner" ? "Uploading..." : "Upload Banner"}</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Avatar</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#050505] bg-black flex-shrink-0 relative group">
                      {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={32} className="m-auto text-white/30 mt-6" />}
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
                        <Camera size={24} />
                        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "avatar")} disabled={!!uploading} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Upload a profile picture</p>
                      <p className="text-sm text-white/50">Square images work best.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: IDENTITY */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-5xl font-black mb-2">Tell your story.</h1>
                  <p className="text-white/50">What should fans call you?</p>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Display Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-4 text-lg text-white outline-none focus:border-red-500 transition" />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="I talk about history, politics, and the unknown..." className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-4 text-lg text-white outline-none focus:border-red-500 transition resize-none" />
                </div>
              </div>
            )}

            {/* STEP 3: MONETIZATION */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-5xl font-black mb-2">Set your price.</h1>
                  <p className="text-white/50">How much should superfans pay for exclusive content?</p>
                </div>
                
                <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 md:p-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-white/50 mb-4"><DollarSign size={20} /> Monthly Subscription</div>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="text-4xl font-black text-white">$</span>
                    <input type="number" min="1" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-transparent text-6xl font-black text-white w-40 text-center outline-none border-b-2 border-white/20 focus:border-red-500 transition pb-2" />
                  </div>
                  <p className="text-sm text-white/40">Trooflix takes 10%. You keep 90% of every subscriber.</p>
                </div>
              </div>
            )}

            {/* STEP 4: DONE */}
            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={48} className="text-green-400" />
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-black mb-2">You're all set.</h1>
                <p className="text-white/50 text-lg max-w-md mx-auto">Your creator page is officially live. It's time to start uploading content and building your empire.</p>
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold bg-yellow-500/10 px-4 py-2 rounded-full mx-auto w-max border border-yellow-500/20 mt-4">
                  <Sparkles size={16} /> Founding Creator Status Applied
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto flex justify-between items-center shrink-0">
        <button 
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} 
          disabled={currentStep === 1 || currentStep === 4}
          className="text-white/50 hover:text-white font-semibold px-6 py-3 transition disabled:opacity-0"
        >
          Back
        </button>
        <button 
          onClick={saveAndNext} 
          className="bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:scale-105 transition flex items-center gap-2 shadow-lg"
        >
          {currentStep === 4 ? "Enter Studio" : "Continue"} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
