"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Video, Mic, MessageSquare, UploadCloud, CheckCircle2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

export default function UploadContentPage() {
  const router = useRouter();
  const [contentType, setContentType] = useState<"video" | "podcast" | "tweet">("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in");

      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("creator_id")
        .eq("user_id", user.id)
        .single();

      let uploadedMediaUrl = "";
      let uploadedThumbnailUrl = "";

      // 1. Upload Media File if it exists
      if (mediaFile) {
        const mediaData = new FormData();
        mediaData.append("file", mediaFile);
        const mediaRes = await fetch("/api/upload", { method: "POST", body: mediaData });
        const mediaJson = await mediaRes.json();
        if (mediaJson.url) uploadedMediaUrl = mediaJson.url;
        else throw new Error("Media upload failed");
      }

      // 2. Upload Thumbnail File if it exists
      if (thumbnailFile) {
        const thumbData = new FormData();
        thumbData.append("file", thumbnailFile);
        const thumbRes = await fetch("/api/upload", { method: "POST", body: thumbData });
        const thumbJson = await thumbRes.json();
        if (thumbJson.url) uploadedThumbnailUrl = thumbJson.url;
        else throw new Error("Thumbnail upload failed");
      }

      // 3. Save to Vercel KV
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          description: description,
          type: contentType === "video" ? "Documentary" : contentType === "podcast" ? "Podcast" : "Tweet",
          creatorId: profile?.creator_id || null,
          videoUrl: contentType === "tweet" ? "" : uploadedMediaUrl, 
          posterUrl: uploadedThumbnailUrl || `https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80`,
          category: "Uncensored"
        })
      });

      if (!res.ok) throw new Error("Failed to save video data");

      setSuccess(true);
      setTimeout(() => {
        router.push("/creator-dashboard");
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-[#1ed760]/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-[#1ed760]" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Uploaded Successfully!</h1>
        <p className="text-white/50 text-sm">Redirecting you to your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Upload Content</h1>
            <p className="text-sm text-white/50">Post to the Feed, Categories, and your Profile.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setContentType("video")} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${contentType === "video" ? "bg-[#E53945]/10 border-[#E53945] text-[#E53945]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
              <Video size={24} />
              <span className="text-xs font-bold">Video</span>
            </button>
            <button type="button" onClick={() => setContentType("podcast")} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${contentType === "podcast" ? "bg-blue-500/10 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
              <Mic size={24} />
              <span className="text-xs font-bold">Podcast</span>
            </button>
            <button type="button" onClick={() => setContentType("tweet")} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${contentType === "tweet" ? "bg-white/10 border-white text-white" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
              <MessageSquare size={24} />
              <span className="text-xs font-bold">Tweet</span>
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1">Title</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945]" placeholder={contentType === 'tweet' ? "What's on your mind?" : "Name your video or podcast..."} />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/60 mb-1">Description / Text</label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E53945] resize-none h-32" placeholder="Write a description or your tweet here..." />
            </div>

            {contentType !== "tweet" && (
              <>
                {/* Media File Upload */}
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Media File (Video or Audio)</label>
                  <div 
                    onClick={() => document.getElementById('media-upload')?.click()}
                    className="w-full bg-[#1c1c1e] border border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#E53945] hover:bg-white/5 transition"
                  >
                    <UploadCloud size={24} className="text-white/50 mb-2" />
                    <span className="text-sm font-bold text-white">
                      {mediaFile ? mediaFile.name : "Tap to select video or audio"}
                    </span>
                    <span className="text-xs text-white/40 mt-1">MP4, MOV, MP3 (Max 50MB)</span>
                  </div>
                  <input 
                    id="media-upload" 
                    type="file" 
                    accept="video/*,audio/*" 
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                </div>

                {/* Thumbnail File Upload */}
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Thumbnail Image</label>
                  <div 
                    onClick={() => document.getElementById('thumb-upload')?.click()}
                    className="w-full bg-[#1c1c1e] border border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#E53945] hover:bg-white/5 transition"
                  >
                    <ImageIcon size={24} className="text-white/50 mb-2" />
                    <span className="text-sm font-bold text-white">
                      {thumbnailFile ? thumbnailFile.name : "Tap to select thumbnail image"}
                    </span>
                    <span className="text-xs text-white/40 mt-1">JPG, PNG, WEBP</span>
                  </div>
                  <input 
                    id="thumb-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                </div>
              </>
            )}
          </div>

          <button disabled={loading} type="submit" className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#E53945]/20">
            {loading ? "Uploading..." : <><UploadCloud size={20} /> Publish {contentType}</>}
          </button>
        </form>
      </div>

      <MobileBottomNav />
    </main>
  );
}
