"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, UploadCloud, ChevronRight, X, Music } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { r2MultipartUpload } from "@/lib/r2Upload";
import { motion } from "framer-motion";
import { MAIN_TYPES, SUB_CATEGORIES, type MainType } from "@/lib/videoTypes";

const AUDIO_TYPES = [
  { id: "song", label: "Song" },
  { id: "podcast-audio", label: "Audio Podcast" },
  { id: "audiobook", label: "Audiobook" },
  { id: "audio", label: "Audio" },
] as const;

function generateThumbnail(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    const done = () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth || 720;
        c.height = v.videoHeight || 1280;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          c.toBlob(b => { URL.revokeObjectURL(url); resolve(b); }, "image/jpeg", 0.82);
          return;
        }
      } catch {}
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.addEventListener("seeked", done, { once: true });
    v.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(null); }, { once: true });
    v.onloadedmetadata = () => {
      try { v.currentTime = Math.min(2, Math.max(0.1, (v.duration || 3) / 2)); } catch { done(); }
    };
    setTimeout(done, 8000);
  });
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAudio = searchParams.get("kind") === "audio";

  const [step, setStep] = useState(1);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [description, setDescription] = useState("");
  const [mainType, setMainType] = useState<MainType>("other");
  const [audioType, setAudioType] = useState<string>("song");
  const [subCategory, setSubCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [tier, setTier] = useState<"free" | "plus" | "creator">("free");

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) { router.replace("/login"); return; }
      try {
        const r = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
        const d = await r.json();
        const raw = String(d.profile?.tier || "free").toLowerCase();
        if (["creator", "podcaster", "pro"].includes(raw)) setTier("creator");
        else if (["plus", "pass", "troopass"].includes(raw)) setTier("plus");
      } catch {}
    }).catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!mediaFile) { setMediaDuration(0); return; }
    const url = URL.createObjectURL(mediaFile);
    const el = document.createElement(isAudio ? "audio" : "video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      setMediaDuration(isFinite((el as HTMLMediaElement).duration) ? (el as HTMLMediaElement).duration : 0);
      URL.revokeObjectURL(url);
    };
    el.onerror = () => URL.revokeObjectURL(url);
    el.src = url;
  }, [mediaFile, isAudio]);

  const onPick = async (f?: File) => {
    if (!f) return;
    if (isAudio) {
      if (!f.type.startsWith("audio/")) { setError("Please choose an audio file."); return; }
      setError("");
      setMediaFile(f);
      setThumbnailBlob(null);
      return;
    }
    if (!f.type.startsWith("video/")) { setError("Please choose a video file."); return; }
    setError("");
    setMediaFile(f);
    setThumbnailBlob(await generateThumbnail(f));
  };

  const next = () => {
    if (step === 1 && !mediaFile) { setError(isAudio ? "Please choose an audio file first." : "Please choose a video first."); return; }
    if (step === 2 && !description.trim()) { setError("Please write a description."); return; }
    if (step === 3 && !isAudio && !mainType) { setError("Please choose a main category."); return; }
    if (step === 3 && isAudio && !audioType) { setError("Please choose an audio type."); return; }
    if (step === 4 && !(subCategory || customCategory.trim())) { setError("Please choose or enter a category."); return; }
    setError("");
    if (step < 4) setStep(step + 1);
    else void publish();
  };

  const publish = async () => {
    if (!mediaFile) return;
    setLoading(true);
    setProgress(0);
    setError("");
    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in");
      const supabase = createClient();
      const { data: profile } = await supabase.from("profiles").select("creator_id").eq("user_id", user.id).maybeSingle();

      const folder = isAudio ? "audio" : "videos";
      const mediaRes = await r2MultipartUpload(mediaFile, { folder, onProgress: p => setProgress(Math.round(p / (isAudio ? 1 : 2))) });
      let posterUrl = "";
      if (!isAudio && thumbnailBlob) {
        const tf = new File([thumbnailBlob], "poster.jpg", { type: "image/jpeg" });
        const tRes = await r2MultipartUpload(tf, { folder: "thumbnails", onProgress: p => setProgress(50 + Math.round(p / 2)) });
        posterUrl = tRes.publicUrl;
      }

      setProgress(100);
      const typeToSave = isAudio ? audioType : mainType;
      const res = await fetch("/api/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: description.trim().split("\n")[0].slice(0, 80) || "Untitled",
          description: description.trim(),
          type: typeToSave,
          category: customCategory.trim() || subCategory,
          creatorId: profile?.creator_id || null,
          uploaderUserId: user.id,
          videoUrl: mediaRes.publicUrl,
          posterUrl,
          backdropUrl: posterUrl,
          visibility: "public",
          feed_visible: true,
          duration: mediaDuration > 0 ? Math.floor(mediaDuration / 60) + ":" + String(Math.floor(mediaDuration % 60)).padStart(2, "0") : "",
        }),
      });
      const saveData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(saveData?.error || `Could not save your ${isAudio ? "audio" : "video"}.`);
      setSuccess(true);
      setTimeout(() => router.push(isAudio ? "/creator-dashboard?studioTab=profile" : "/"), 1800);
    } catch (e: any) {
      setError(e?.message || "Upload failed. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-[#1ed760]/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-[#1ed760]" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">{isAudio ? "Audio published" : "Video published"}</h1>
        <p className="text-white/50 text-sm">{isAudio ? "Taking you to your profile…" : "Taking you home…"}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 text-white/70 hover:text-white"><ArrowLeft size={24} /></button>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(n => <span key={n} className={`h-1.5 w-6 rounded-full ${n <= step ? "bg-[#E53945]" : "bg-white/15"}`} />)}
          </div>
          <span className="w-10 text-right text-xs text-white/40">{step}/4</span>
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-2xl font-black mb-1">{isAudio ? "Upload audio" : "Upload video"}</h1>
            <p className="text-sm text-white/50 mb-6">{isAudio ? "Choose an audio file from your device." : "Choose a video from your camera roll."}</p>
            <div onClick={() => document.getElementById("upload-media-input")?.click()} className="w-full bg-[#1c1c1e] border border-dashed border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[#E53945] transition min-h-[240px]">
              {!isAudio && thumbnailBlob ? (
                <img src={URL.createObjectURL(thumbnailBlob)} alt="Video preview" className="max-h-[160px] rounded-lg mb-3" />
              ) : isAudio && mediaFile ? (
                <Music size={40} className="text-[#E53945] mb-3" />
              ) : (
                <UploadCloud size={40} className="text-white/50 mb-3" />
              )}
              <span className="text-sm font-bold text-white text-center">{mediaFile ? mediaFile.name : (isAudio ? "Tap to choose an audio file" : "Tap to choose a video")}</span>
              {isAudio && <span className="text-xs text-white/40 mt-2">Song, audio podcast, audiobook & more</span>}
            </div>
            <input id="upload-media-input" type="file" accept={isAudio ? "audio/*" : "video/*"} className="hidden" onChange={e => { void onPick(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-black mb-1">Description</h1>
            <p className="text-sm text-white/50 mb-6">{isAudio ? "Tell people what this audio is about." : "Tell people what this video is about."}</p>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} placeholder={isAudio ? "Write a title or description..." : "Write a caption..."} className="w-full bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/30 outline-none focus:border-[#E53945] resize-none" autoFocus />
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-black mb-1">{isAudio ? "Audio type" : "Main category"}</h1>
            <p className="text-sm text-white/50 mb-6">{isAudio ? "What kind of audio is this?" : "What kind of video is this?"}</p>
            {isAudio ? (
              <div className="grid grid-cols-2 gap-3">
                {AUDIO_TYPES.map(t => (
                  <button key={t.id} onClick={() => setAudioType(t.id)} className={`p-5 rounded-2xl border text-left transition ${audioType === t.id ? "bg-[#E53945]/15 border-[#E53945] text-white" : "bg-[#1c1c1e] border-white/10 text-white/60 hover:border-white/25"}`}>
                    <span className="text-base font-bold">{t.label}</span>
                    {t.id === "song" && <span className="block text-[11px] text-white/40 mt-1">Music / single / track</span>}
                    {t.id === "podcast-audio" && <span className="block text-[11px] text-white/40 mt-1">Podcast episode or show</span>}
                    {t.id === "audiobook" && <span className="block text-[11px] text-white/40 mt-1">Book or chapter</span>}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {MAIN_TYPES.filter(t => tier === "creator" || t.id === "short").map(t => (
                    <button key={t.id} onClick={() => setMainType(t.id)} className={`p-5 rounded-2xl border text-left transition ${mainType === t.id ? "bg-[#E53945]/15 border-[#E53945] text-white" : "bg-[#1c1c1e] border-white/10 text-white/60 hover:border-white/25"}`}>
                      <span className="text-base font-bold">{t.label}</span>
                      {tier !== "creator" && t.id !== "short" && <span className="block text-[11px] text-white/30 mt-1">Creator only</span>}
                    </button>
                  ))}
                </div>
                {tier !== "creator" && (
                  <Link href="/upgrade" className="block mt-4 text-center text-xs text-[#F06A72] font-semibold">
                    Upgrade to Creator to upload videos, podcasts, films and documentaries →
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-2xl font-black mb-1">Sub-category</h1>
            <p className="text-sm text-white/50 mb-6">Pick a topic, or type your own.</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {SUB_CATEGORIES.map(c => (
                <button key={c} onClick={() => { setSubCategory(c); setCustomCategory(""); }} className={`px-4 py-2 rounded-full border text-sm font-semibold transition ${subCategory === c ? "bg-[#E53945] border-[#E53945] text-white" : "bg-white/5 border-white/10 text-white/60 hover:border-white/25"}`}>{c}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-[#1c1c1e] border border-white/10 rounded-xl px-4">
              <input value={customCategory} onChange={e => { setCustomCategory(e.target.value); if (e.target.value) setSubCategory(""); }} placeholder="Or type your own category..." className="flex-1 bg-transparent py-3.5 text-white placeholder:text-white/30 outline-none" />
              {customCategory && <button onClick={() => setCustomCategory("")} className="text-white/40"><X size={16} /></button>}
            </div>
          </div>
        )}

        {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="mt-8 bg-[#1c1c1e] border border-white/10 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2"><span className="text-white/60">Uploading…</span><span className="font-bold">{progress}%</span></div>
            <div className="h-2 bg-black rounded-full overflow-hidden"><div className="h-full bg-[#E53945] transition-all" style={{ width: progress + "%" }} /></div>
          </div>
        ) : (
          <button onClick={next} className="mt-8 w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition">
            {step === 4 ? (isAudio ? "Publish audio" : "Publish video") : "Continue"} <ChevronRight size={18} />
          </button>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}

export default function UploadPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#09090B]" />}><UploadContent /></Suspense>;
}
