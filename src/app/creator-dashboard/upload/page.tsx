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
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // EXACT LOGIC FROM ADMIN PANEL
  const uploadFile = (file: File, folder: string, onDone: (url: string) => void) => {
    setUploading(folder);
    setProgress(0);
    setStatus("Preparing...");

    fetch("/api/r2-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", folder }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to get upload URL"); return r.json(); })
      .then(({ uploadUrl, publicUrl }) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        
        xhr.upload.onprogress = (e) => { 
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); 
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onDone(publicUrl);
            setStatus("✅ Uploaded");
            setTimeout(() => setStatus(""), 2000);
          } else { 
            setStatus("❌ Upload failed: " + xhr.status); 
          }
          setUploading(null); 
          setProgress(0);
        };
        
        xhr.onerror = () => { 
          setStatus("❌ Upload network error"); 
          setUploading(null); 
          setProgress(0); 
        };
        
        xhr.send(file);
      })
      .catch((e) => { 
        setStatus("❌ " + e.message); 
        setUploading(null); 
        setProgress(0); 
      });
  };

  const handlePublish = async () => {
    setError("");
    if (!isTweet && !videoUrl) { setError("Upload a video first."); return; }
    setSaving(true);
    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in.");
      const supabase = createClient();
      const { data: profile } = await supabase.from("profiles").select("creator_id").eq("user_id", user.id).single();

      const res = await fetch("/api/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isTweet ? "Tweet" : title,
          description,
          type: isTweet ? "Tweet" : isShort ? "Short" : "Documentary",
          creatorId: profile?.creator_id || null,
          uploaderUserId: user.id,
          videoUrl,
          posterUrl,
          category: isTweet ? "Tweets" : isShort ? "Shorts" : "History",
          visibility: "public",
          feed_visible: isTweet ? true : isShort ? false : true,
        }),
      });
      if (!res.ok) throw new Error("Save failed: HTTP " + res.status);
      router.push(isTweet ? "/" : isShort ? "/feed" : "/creator-dashboard");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

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
            <div className="space-y-1">
              <p className="text-xs font-bold text-white/60">Video File</p>
              <input type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "videos", setVideoUrl); e.target.value = ""; }} className="block w-full text-sm text-white/80" disabled={!!uploading} />
              {videoUrl && <p className="text-xs text-green-400 break-all">✓ Video uploaded</p>}
            </div>
            
            {!isShort && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-white/60">Thumbnail</p>
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "posters", setPosterUrl); e.target.value = ""; }} className="block w-full text-sm text-white/80" disabled={!!uploading} />
                {posterUrl && <p className="text-xs text-green-400 break-all">✓ Thumbnail uploaded</p>}
              </div>
            )}
          </>
        )}

        {uploading && (
          <div className="p-4 bg-[#1c1c1e] rounded-xl border border-white/10">
            <div className="flex justify-between mb-2">
              <span className="text-sm">{status} {uploading}</span>
              <span className="text-sm text-[#E53945]">{progress}%</span>
            </div>
            <div className="h-2 bg-black rounded-full overflow-hidden">
              <div className="h-full bg-[#E53945] transition-all" style={{ width: progress + "%" }} />
            </div>
          </div>
        )}
        
        {status && !uploading && <p className="text-sm font-semibold">{status}</p>}
        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm break-words">{error}</div>}
        
        <button onClick={handlePublish} disabled={saving || !!uploading} className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl disabled:opacity-50">
          {saving ? "Saving..." : `Publish ${isTweet ? "Tweet" : isShort ? "Short" : "Video"}`}
        </button>
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
