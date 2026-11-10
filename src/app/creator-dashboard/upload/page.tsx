"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Image as ImageIcon, Globe, Lock, Home, User, UploadCloud, MessageSquare, ChevronRight } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { r2MultipartUpload } from "@/lib/r2Upload";

const CATEGORIES = ["Documentaries","long-videos","Independent Films","Books","History","Politics & Geopolitics","War & Conflict","True Crime & Justice","Conspiracy & Mystery","Society & Culture","Business & Finance","Science & Technology","Environment & Nature","Religion & Spirituality","Ancient Civilisation","Comedy","News","Gaming","Medicine"];

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isShort = searchParams.get("type") === "short";
  const isTweet = searchParams.get("type") === "tweet";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("History");
  const [visibility, setVisibility] = useState<"public" | "premium">("public");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [autoThumbnailPreview, setAutoThumbnailPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [step, setStep] = useState(1);
  const [userTier, setUserTier] = useState<"free" | "plus" | "creator">("free");
  const [videoDuration, setVideoDuration] = useState(0);
  const [checkingTier, setCheckingTier] = useState(true);
  const totalSteps = isTweet ? 1 : isShort ? 3 : 5;

  // Fetch user tier on mount
  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) { setCheckingTier(false); return; }
      try {
        const r = await fetch("/api/profile?user_id=" + u.id);
        const d = await r.json();
        const rawTier = String(d.profile?.tier || "free").toLowerCase();
        const normalized: "free" | "plus" | "creator" =
          (rawTier === "creator" || rawTier === "creator" || rawTier === "pro") ? "creator" :
          (rawTier === "plus" || rawTier === "pass" || rawTier === "troopass") ? "plus" :
          "free";
        setUserTier(normalized);
      } catch { setUserTier("free"); }
      setCheckingTier(false);
    });
  }, []);

  // Extract video duration when file is picked
  useEffect(() => {
    if (!mediaFile) { setVideoDuration(0); return; }
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      const dur = isFinite(vid.duration) ? vid.duration : 0;
      setVideoDuration(dur);
      URL.revokeObjectURL(vid.src);
    };
    vid.onerror = () => setVideoDuration(0);
    vid.src = URL.createObjectURL(mediaFile);
  }, [mediaFile]);

  // Hard gate: Redirect if this upload type isn't allowed for their tier
  useEffect(() => {
    if (checkingTier) return;
    if (isTweet && userTier !== "creator") {
      alert("Only Creator tier can post Tweets. Redirecting you to upgrade...");
      router.push("/upgrade");
    }
    if (!isShort && !isTweet && userTier !== "creator") {
      alert("Only Creator tier can upload long-form videos. Redirecting you to upgrade...");
      router.push("/upgrade");
    }
  }, [userTier, isShort, isTweet, checkingTier, router]);

  const uploadToSupabase = async (file: File, label: string) => {
    if (file.size === 0) throw new Error(label + " is 0 bytes. On iPhone, wait for iCloud download first.");
    setUploadStatus("Uploading " + label + "...");
    setUploadProgress(0);
    const folder = label === "Thumbnail" ? "thumbnails" : "videos";
    const { publicUrl } = await r2MultipartUpload(file, {
      folder,
      onProgress: (p) => setUploadProgress(p),
    });
    return publicUrl;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!isTweet && !mediaFile) return alert("Please select a video file.");
      if (isTweet && !description.trim()) return alert("Please write your tweet.");
      // Free tier short must be under 3 minutes
      if (isShort && userTier === "free" && videoDuration > 180) {
        return alert("Free accounts can only upload Shorts up to 3 minutes long. Upgrade to Plus for unlimited Shorts length.");
      }
      if (isShort && userTier === "plus" && videoDuration > 1200) {
        return alert("Plus accounts can only upload Shorts up to 20 minutes long. Upgrade to Creator for unlimited.");
      }
    }
    if (step === 2) {
      if (isShort && !title.trim()) return alert("Please enter a title.");
      if (!isShort && !thumbnailFile) return alert("Please select a thumbnail.");
    }
    if (step === 3) {
      if (isShort && !description.trim()) return alert("Please enter a description.");
      if (!isShort && !title.trim()) return alert("Please enter a title.");
    }
    if (step === 4 && !description.trim()) return alert("Please enter a description.");
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      if (isTweet || isShort) publishContent(true);
      else setShowSharePrompt(true);
    }
  };

  const publishContent = async (shareToFeed: boolean) => {
    setShowSharePrompt(false);
    setLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in");
      const supabase = createClient();
      let creatorId = null;
      try {
        const { data: profile } = await supabase.from("profiles").select("creator_id").eq("user_id", user.id).maybeSingle();
        if (profile) creatorId = profile.creator_id;
      } catch (err) {
        console.warn("Profile fetch failed, proceeding with userId only", err);
      }

      const thumbUrl = (!isTweet && !isShort && thumbnailFile) ? await uploadToSupabase(thumbnailFile, "Thumbnail") : "";
      const mediaUrl = (!isTweet && mediaFile) ? await uploadToSupabase(mediaFile, "Video") : "";

      setUploadStatus("Saving...");
      setUploadProgress(100);

      const res = await fetch("/api/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isTweet ? "Tweet" : title,
          description,
          type: isTweet ? "Tweet" : (isShort ? "Short" : "long-video"),
          creatorId: creatorId || null,
          uploaderUserId: user.id,
          videoUrl: mediaUrl,
          posterUrl: thumbUrl,
          category: isTweet ? "Tweets" : (isShort ? "Shorts" : category),
          visibility: isTweet ? "public" : (isShort ? "public" : visibility),
          feed_visible: isTweet ? true : (isShort ? false : shareToFeed),
          duration: videoDuration > 0 ? Math.floor(videoDuration / 60) + ":" + String(Math.floor(videoDuration % 60)).padStart(2, "0") : "",
        }),
      });

      if (!res.ok) throw new Error("Failed to save data");
      setSuccess(true);
      setTimeout(() => router.push(isTweet ? "/" : (isShort ? "/feed" : "/creator-dashboard")), 2200);
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + err.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#0a0303] text-white flex flex-col items-center justify-center px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-[#1ed760]/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-[#1ed760]" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">{isTweet ? "Tweet Published" : (isShort ? "Short Published" : "Video Published")}</h1>
        <p className="text-white/50 text-sm">Redirecting...</p>
      </main>
    );
  }

  const generateThumbnail = (file: File) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      // Seek to 90 seconds, or halfway if the video is shorter
      const dur = video.duration || 0;
      const seekTime = Math.min(90, dur / 2) || 1;
      try { video.currentTime = seekTime; } catch {}
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const generatedFile = new File([blob], "auto-poster.jpg", { type: "image/jpeg" });
            setThumbnailFile(generatedFile);
            setAutoThumbnailPreview(URL.createObjectURL(blob));
          }
          URL.revokeObjectURL(video.src);
        }, "image/jpeg", 0.85);
      } catch (e) {
        console.error("Auto-thumbnail generation failed:", e);
      }
    };
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition"><ArrowLeft size={20} /></Link>
          <div><h1 className="text-2xl font-bold">{isTweet ? "Add a Tweet" : (isShort ? "Upload Short" : "Upload Video")}</h1>
          <p className="text-sm text-white/50">Step {step} of {totalSteps}</p></div>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-[#E53945] transition-all duration-300" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            {step === 1 && !isTweet && (<div><label className="block text-xs font-bold text-white/60 mb-1">Video File *</label><div onClick={() => document.getElementById("media-upload")?.click()} className="w-full bg-[#1c1c1e] border border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#E53945] transition min-h-[200px]"><UploadCloud size={32} className="text-white/50 mb-3" /><span className="text-sm font-bold text-white text-center">{mediaFile ? mediaFile.name : "Tap to select video"}</span></div><input id="media-upload" type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0] || null; setMediaFile(f); if (f) generateThumbnail(f); }} className="hidden" /></div>)}
            
            {step === 2 && !isShort && !isTweet && (
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1 flex items-center gap-2">
                  Thumbnail {autoThumbnailPreview && <span className="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 rounded">AUTO</span>}
                </label>
                {autoThumbnailPreview ? (
                  <div className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
                    <img src={autoThumbnailPreview} alt="Auto thumbnail" className="w-full max-w-[280px] aspect-video object-cover rounded-lg shadow-md mb-3" />
                    <button type="button" onClick={() => document.getElementById("thumb-upload")?.click()} className="text-xs text-[#E53945] hover:underline font-semibold">Upload Custom Instead</button>
                  </div>
                ) : (
                  <div onClick={() => document.getElementById("thumb-upload")?.click()} className="w-full bg-[#1c1c1e] border border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#E53945] transition min-h-[200px]">
                    <ImageIcon size={32} className="text-white/50 mb-3" />
                    <span className="text-sm font-bold text-white text-center">{thumbnailFile ? thumbnailFile.name : "Tap to select thumbnail"}</span>
                  </div>
                )}
                <input id="thumb-upload" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbnailFile(f); setAutoThumbnailPreview(null); } }} className="hidden" />
              </div>
            )}

            {((isShort && step === 2) || (!isShort && !isTweet && step === 3)) && (<div><label className="block text-xs font-bold text-white/60 mb-1">Title *</label><input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945]" placeholder="Name your video..." /></div>)}

            {((isTweet && step === 1) || (isShort && step === 3) || (!isShort && !isTweet && step === 4)) && (<div><label className="block text-xs font-bold text-white/60 mb-1">{isTweet ? "What is on your mind?" : "Description"} *</label><textarea required value={description} onChange={e => setDescription(e.target.value)} className={"w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945] resize-none " + (isTweet ? "h-40" : "h-24")} placeholder={isTweet ? "Write your tweet..." : "Write a description..."} /></div>)}

            {step === 5 && !isShort && !isTweet && (<><div><label className="block text-xs font-bold text-white/60 mb-1">Category *</label><select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945] appearance-none">{CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
            <div className="mt-4"><label className="block text-xs font-bold text-white/60 mb-1">Visibility *</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setVisibility("public")} className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border transition " + (visibility === "public" ? "bg-[#E53945]/10 border-[#E53945] text-[#E53945]" : "bg-white/5 border-white/10 text-white/50")}><Globe size={18} /><span className="text-[10px] font-bold uppercase">Public</span></button><button type="button" onClick={() => setVisibility("premium")} className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border transition " + (visibility === "premium" ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]" : "bg-white/5 border-white/10 text-white/50")}><Lock size={18} /><span className="text-[10px] font-bold uppercase">Premium</span></button></div></div></>)}
          </div>

          {loading ? (
            <div className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-4 flex flex-col gap-3"><div className="flex items-center justify-between"><span className="text-sm font-bold text-white">{uploadStatus}</span><span className="text-sm font-black text-[#E53945]">{uploadProgress}%</span></div><div className="w-full h-2 bg-black rounded-full overflow-hidden"><div className="h-full bg-[#E53945] transition-all duration-300" style={{ width: uploadProgress + "%" }} /></div></div>
          ) : (
            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button type="button" onClick={() => setStep(step - 1)} className="py-4 px-6 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition">Back</button>
              )}
              <button type="button" onClick={handleNext} className="flex-1 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2">
                {step === totalSteps ? (
                  <>{isTweet ? <MessageSquare size={20} /> : <UploadCloud size={20} />} Publish {isTweet ? "Tweet" : (isShort ? "Short" : "Video")}</>
                ) : (
                  <>Next <ChevronRight size={20} /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {showSharePrompt && !isShort && !isTweet && (
          <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[400]" onClick={() => setShowSharePrompt(false)} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-[#0a0303] rounded-t-3xl border-t border-white/10 z-[410] p-6 pb-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-5" /><h3 className="text-xl font-black text-center mb-2">Share to Home Feed?</h3><p className="text-sm text-white/50 text-center mb-6">Where should this video be visible?</p>
            <div className="flex flex-col gap-3"><button onClick={() => publishContent(true)} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left"><div className="w-12 h-12 rounded-full bg-[#E53945]/20 flex items-center justify-center shrink-0"><Home className="text-[#E53945]" size={22} /></div><div><h4 className="font-bold text-white">Yes — Share to Home Feed</h4><p className="text-xs text-white/50">Visible on homepage and profile.</p></div></button>
            <button onClick={() => publishContent(false)} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left"><div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0"><User className="text-white" size={22} /></div><div><h4 className="font-bold text-white">No — Profile Only</h4><p className="text-xs text-white/50">Only visible on your profile.</p></div></button></div>
            <button onClick={() => setShowSharePrompt(false)} className="w-full text-center text-white/40 text-sm font-semibold mt-4 py-2">Cancel</button>
          </motion.div></>
        )}
      </AnimatePresence>
      <MobileBottomNav />
    </main>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0303] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>}>
      <UploadContent />
    </Suspense>
  );
}
