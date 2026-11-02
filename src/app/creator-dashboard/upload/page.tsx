"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Image as ImageIcon, Globe, Lock, Home, User, UploadCloud, MessageSquare } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  "Documentaries", "Podcasts", "Independent Films", "Books", "History", 
  "Politics & Geopolitics", "War & Conflict", "True Crime & Justice", 
  "Conspiracy & Mystery", "Society & Culture", "Business & Finance", 
  "Science & Technology", "Environment & Nature", "Religion & Spirituality", 
  "Ancient Civilisation", "Comedy", "News", "Gaming"
];

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

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const uploadThumbnail = async (file: File) => {
    if (file.size === 0) throw new Error("Thumbnail is 0 bytes.");
    let processedBlob: Blob = file;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const MAX = 1280;
      let w = bitmap.width, h = bitmap.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = (h / w) * MAX; w = MAX; } else { w = (w / h) * MAX; h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, w, h);
        processedBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas export failed")), "image/jpeg", 0.85);
        });
      }
    } catch (e) {}
    const res = await fetch("/api/r2-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "thumbnail.jpg", contentType: "image/jpeg" }),
    });
    const { uploadUrl, publicUrl, error } = await res.json();
    if (error) throw new Error(error);
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", "image/jpeg");
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(true) : reject(new Error("Thumbnail upload failed"));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(processedBlob);
    });
    return publicUrl;
  };

  const uploadChunked = async (file: File) => {
    if (file.size === 0) throw new Error("Video is 0 bytes. Wait for iCloud download.");
    
    setUploadStatus("Preparing chunked upload...");
    setUploadProgress(0);

    // 1. Initialize the multipart upload on R2 via a new API route
    const initRes = await fetch("/api/r2-multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "video/mp4" }),
    });
    
    if (!initRes.ok) throw new Error("Failed to initialize upload");
    
    const { uploadId, key } = await initRes.json();
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    const parts: { PartNumber: number; ETag: string }[] = [];

    // 2. Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      setUploadStatus(`Uploading chunk ${i + 1} of ${totalChunks}...`);

      const chunkRes = await fetch("/api/r2-multipart/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, key, partNumber: i + 1 }),
      });

      if (!chunkRes.ok) throw new Error("Failed to get chunk URL");
      const { uploadUrl } = await chunkRes.json();

      // Upload the chunk to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const chunkProgress = (event.loaded / event.total) * (100 / totalChunks);
            const overallProgress = Math.round((i * (100 / totalChunks)) + chunkProgress);
            setUploadProgress(overallProgress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            let etag = xhr.getResponseHeader("ETag");
            if (!etag) {
              reject(new Error("Missing ETag on chunk " + (i + 1) + ". Check R2 CORS settings."));
              return;
            }
            // Cloudflare sometimes returns ETag with quotes, clean it up
            etag = etag.replace(/^"+|"+$/g, "");
            parts.push({ PartNumber: i + 1, ETag: etag });
            resolve();
          } else {
            reject(new Error("Chunk upload failed with status " + xhr.status));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during chunk upload"));
        xhr.send(chunk);
      });
    }

    // 3. Complete the upload
    if (parts.length === 0) {
      throw new Error("No chunks were uploaded successfully. Please try again.");
    }
    setUploadStatus("Finalizing upload...");
    const completeRes = await fetch("/api/r2-multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, key, parts }),
    });

    if (!completeRes.ok) throw new Error("Failed to finalize upload");
    const { publicUrl } = await completeRes.json();
    
    setUploadProgress(100);
    return publicUrl;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTweet) {
      if (!description.trim()) return alert("Please write some text for your tweet.");
      publishContent(true);
      return;
    }
    if (!mediaFile) return alert("Please select a video file.");
    if (isShort) {
      publishContent(true);
    } else {
      if (!thumbnailFile) return alert("Please select a thumbnail image.");
      setShowSharePrompt(true);
    }
  };

  const publishContent = async (shareToFeed: boolean) => {
    setShowSharePrompt(false);
    setLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in");
      const supabase = createClient();
      const { data: profile } = await supabase.from("profiles").select("creator_id").eq("user_id", user.id).single();
      
      const uploadedThumbnailUrl = (!isTweet && !isShort && thumbnailFile) ? await uploadThumbnail(thumbnailFile) : "";
      const uploadedMediaUrl = (!isTweet && mediaFile) ? await uploadChunked(mediaFile) : "";

      setUploadStatus("Saving data...");
      setUploadProgress(100);

      const res = await fetch("/api/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isTweet ? "Tweet" : title,
          description,
          type: isTweet ? "Tweet" : (isShort ? "Short" : "Documentary"),
          creatorId: profile?.creator_id || null,
          uploaderUserId: user.id,
          videoUrl: uploadedMediaUrl,
          posterUrl: uploadedThumbnailUrl,
          category: isTweet ? "Tweets" : (isShort ? "Shorts" : category),
          visibility: isTweet ? "public" : (isShort ? "public" : visibility),
          feed_visible: isTweet ? true : (isShort ? false : shareToFeed),
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
        <p className="text-white/50 text-sm">Redirecting you now...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{isTweet ? "Add a Tweet" : (isShort ? "Upload Short" : "Upload Video")}</h1>
            <p className="text-sm text-white/50">{isTweet ? "Share your thoughts with your followers." : (isShort ? "Publish directly to the Shorts feed." : "Publish to your profile and the home feed.")}</p>
          </div>
        </div>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="space-y-4">
            {!isTweet && (
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Title <span className="text-[#E53945]">*</span></label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945]" placeholder="Name your video..." />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1">{isTweet ? "What is on your mind?" : "Description"} <span className="text-[#E53945]">*</span></label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)} className={"w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945] resize-none " + (isTweet ? "h-40" : "h-24")} placeholder={isTweet ? "Write your tweet here..." : "Write a description..."} />
            </div>
            {!isShort && !isTweet && (
              <>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Category <span className="text-[#E53945]">*</span></label>
                  <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945] appearance-none">
                    {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Visibility <span className="text-[#E53945]">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setVisibility("public")} className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border transition " + (visibility === "public" ? "bg-[#E53945]/10 border-[#E53945] text-[#E53945]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10")}>
                      <Globe size={18} />
                      <span className="text-[10px] font-bold uppercase">Public</span>
                    </button>
                    <button type="button" onClick={() => setVisibility("premium")} className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border transition " + (visibility === "premium" ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10")}>
                      <Lock size={18} />
                      <span className="text-[10px] font-bold uppercase">Premium</span>
                    </button>
                  </div>
                </div>
              </>
            )}
            {!isTweet && (
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Video File <span className="text-[#E53945]">*</span></label>
                <div onClick={() => document.getElementById("media-upload")?.click()} className="w-full bg-[#1c1c1e] border border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#E53945] hover:bg-white/5 transition">
                  <UploadCloud size={24} className="text-white/50 mb-2" />
                  <span className="text-sm font-bold text-white">{mediaFile ? mediaFile.name : "Tap to select video"}</span>
                  <span className="text-xs text-white/40 mt-1">Any size</span>
                </div>
                <input id="media-upload" type="file" accept="video/*" onChange={(e) => setMediaFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
            )}
            {!isShort && !isTweet && (
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Thumbnail Image <span className="text-[#E53945]">*</span></label>
                <div onClick={() => document.getElementById("thumb-upload")?.click()} className="w-full bg-[#1c1c1e] border border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#E53945] hover:bg-white/5 transition">
                  <ImageIcon size={24} className="text-white/50 mb-2" />
                  <span className="text-sm font-bold text-white">{thumbnailFile ? thumbnailFile.name : "Tap to select thumbnail"}</span>
                  <span className="text-xs text-white/40 mt-1">JPG, PNG, WEBP</span>
                </div>
                <input id="thumb-upload" type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
            )}
          </div>
          {loading ? (
            <div className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{uploadStatus}</span>
                <span className="text-sm font-black text-[#E53945]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-[#E53945] transition-all duration-300 ease-out" style={{ width: uploadProgress + "%" }} />
              </div>
              <p className="text-[10px] text-white/40 text-center">Please do not close this tab.</p>
            </div>
          ) : (
            <button type="submit" className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#E53945]/20">
              {isTweet ? <MessageSquare size={20} /> : <UploadCloud size={20} />} Publish {isTweet ? "Tweet" : (isShort ? "Short" : "Video")}
            </button>
          )}
        </form>
      </div>
      <AnimatePresence>
        {showSharePrompt && !isShort && !isTweet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400]" onClick={() => setShowSharePrompt(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }} className="fixed bottom-0 left-0 right-0 bg-[#0a0303] rounded-t-3xl border-t border-white/10 z-[410] p-6 pb-10 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
              <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-5" />
              <h3 className="text-xl font-black text-center mb-2">Share to Home Feed?</h3>
              <p className="text-sm text-white/50 text-center mb-6">Where should this video be visible?</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => publishContent(true)} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-left">
                  <div className="w-12 h-12 rounded-full bg-[#E53945]/20 flex items-center justify-center shrink-0"><Home className="text-[#E53945]" size={22} /></div>
                  <div>
                    <h4 className="font-bold text-white">Yes — Share to Home Feed</h4>
                    <p className="text-xs text-white/50">Visible on the homepage and your profile.</p>
                  </div>
                </button>
                <button onClick={() => publishContent(false)} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-left">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0"><User className="text-white" size={22} /></div>
                  <div>
                    <h4 className="font-bold text-white">No — Profile Only</h4>
                    <p className="text-xs text-white/50">Only visible on your creator profile.</p>
                  </div>
                </button>
              </div>
              <button onClick={() => setShowSharePrompt(false)} className="w-full text-center text-white/40 text-sm font-semibold mt-4 py-2">Cancel</button>
            </motion.div>
          </>
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
