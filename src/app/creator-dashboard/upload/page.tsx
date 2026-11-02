"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isShort = searchParams.get("type") === "short";
  const isTweet = searchParams.get("type") === "tweet";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const uploadFile = async (file: File, label: string): Promise<string> => {
    if (!file || file.size === 0) throw new Error(label + " is 0 bytes. On iPhone, wait for iCloud download.");
    setStatus("Preparing " + label + "...");
    setProgress(0);
    const presignRes = await fetch("/api/r2-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" }),
    });
    if (!presignRes.ok) throw new Error("Failed to prepare " + label);
    const { uploadUrl, publicUrl, error: pErr } = await presignRes.json();
    if (pErr) throw new Error(pErr);
    setStatus("Uploading " + label + "...");
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(label + " failed: HTTP " + xhr.status));
      xhr.onerror = () => reject(new Error("Network error on " + label));
      xhr.send(file);
    });
    return publicUrl;
  };

  const handlePublish = async () => {
    setError("");
    setLoading(true);
    setProgress(0);
    try {
      if (!isTweet && !mediaFile) throw new Error("Select a video.");
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in.");
      const supabase = createClient();
      const { data: profile } = await supabase.from("profiles").select("creator_id").eq("user_id", user.id).single();
      const thumbUrl = (!isTweet && !isShort && thumbnailFile) ? await uploadFile(thumbnailFile, "Thumbnail") : "";
      const mediaUrl = (!isTweet && mediaFile) ? await uploadFile(mediaFile, "Video") : "";
      setStatus("Saving...");
      setProgress(100);
      const res = await fetch("/api/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isTweet ? "Tweet" : title,
          description,
          type: isTweet ? "Tweet" : isShort ? "Short" : "Documentary",
          creatorId: profile?.creator_id || null,
          uploaderUserId: user.id,
          videoUrl: mediaUrl,
          posterUrl: thumbUrl,
          category: isTweet ? "Tweets" : isShort ? "Shorts" : "History",
          visibility: "public",
          feed_visible: isTweet ? true : isShort ? false : true,
        }),
      });
      if (!res.ok) throw new Error("Save failed: HTTP " + res.status);
      setSuccess(true);
      setTimeout(() => router.push(isTweet ? "/" : isShort ? "/feed" : "/creator-dashboard"), 2000);
    } catch (err: any) {
      setError(err.message || "Upload failed.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Published!</h1>
          <p className="text-white/50">Redirecting...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-32">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-24 space-y-4">
        <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-2xl font-bold">{isTweet ? "Add a Tweet" : isShort ? "Upload Short" : "Upload Video"}</h1>
        {!isTweet && (
          <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white" />
        )}
        <textarea placeholder={isTweet ? "What is on your mind?" : "Description"} value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-3 text-white" />
        {!isTweet && (
          <>
            <div>
              <p className="text-xs font-bold text-white/60 mb-1">Video File</p>
              <input type="file" accept="video/*" onChange={e => setMediaFile(e.target.files?.[0] || null)} className="block w-full text-sm text-white/80" />
            </div>
            {!isShort && (
              <div>
                <p className="text-xs font-bold text-white/60 mb-1">Thumbnail</p>
                <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} className="block w-full text-sm text-white/80" />
              </div>
            )}
          </>
        )}
        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm break-words">{error}</div>}
        {loading ? (
          <div className="p-4 bg-[#1c1c1e] rounded-xl">
            <div className="flex justify-between mb-2"><span className="text-sm">{status}</span><span className="text-sm text-[#E53945]">{progress}%</span></div>
            <div className="h-2 bg-black rounded-full overflow-hidden"><div className="h-full bg-[#E53945] transition-all" style={{ width: progress + "%" }} /></div>
          </div>
        ) : (
          <button onClick={handlePublish} className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl">
            Publish {isTweet ? "Tweet" : isShort ? "Short" : "Video"}
          </button>
        )}
      </div>
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
