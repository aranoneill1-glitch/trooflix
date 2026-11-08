"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";

export default function FixPostersPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTitle, setCurrentTitle] = useState("");
  const [results, setResults] = useState<{ id: number, success: boolean }[]>([]);

  useEffect(() => {
    async function load() {
      const user = await getCachedUser();
      if (!user) return;
      
      const res = await fetch("/api/videos");
      const data = await res.json();
      
      // Filter for videos uploaded by this user that have a videoUrl (skip external links)
      const myVids = Array.isArray(data) ? data.filter((v: any) => 
        String(v.uploaderUserId) === String(user.id) && (v.videoUrl || v.bitchuteUrl)
      ) : [];
      
      setVideos(myVids);
      setLoading(false);
    }
    load();
  }, []);

  const generatePoster = async (video: any) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // 1. Fetch video via proxy (bypasses CORS)
        const proxyUrl = "/api/proxy-video?url=" + encodeURIComponent(video.videoUrl || video.bitchuteUrl);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Failed to fetch video (HTTP ${res.status})`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        const vid = document.createElement("video");
        vid.src = blobUrl;
        vid.muted = true;
        vid.preload = "auto";

        const timeout = setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error("Timeout: Video took too long to load or seek."));
        }, 15000);

        vid.onloadedmetadata = () => {
          const seekTime = Math.min(45, vid.duration / 2) || 1;
          try { vid.currentTime = seekTime; } catch {}
        };

        vid.onseeked = async () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement("canvas");
            canvas.width = vid.videoWidth || 1280;
            canvas.height = vid.videoHeight || 720;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context failed");

            ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(async (blob) => {
              if (!blob) {
                URL.revokeObjectURL(blobUrl);
                return reject(new Error("Canvas toBlob failed"));
              }

              try {
                // 2. Upload image to R2 via simple form data (bypasses multipart CORS issues)
                const file = new File([blob], "auto-poster.jpg", { type: "image/jpeg" });
                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await fetch("/api/upload-image", {
                  method: "POST",
                  body: formData,
                });

                if (!uploadRes.ok) {
                  const errBody = await uploadRes.text();
                  throw new Error(`Upload failed (${uploadRes.status}): ${errBody.slice(0, 100)}`);
                }

                const uploadData = await uploadRes.json();
                const publicUrl = uploadData.publicUrl;

                if (!publicUrl) throw new Error("Upload returned no publicUrl");
                console.log(`[Poster] Uploaded for "${video.title}" -> ${publicUrl}`);

                // 3. Update the video record
                const updateRes = await fetch("/api/videos/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: video.id, posterUrl: publicUrl }),
                });

                if (!updateRes.ok) {
                  const errBody = await updateRes.text();
                  throw new Error(`DB update failed (${updateRes.status}): ${errBody.slice(0, 100)}`);
                }

                console.log(`[Poster] DB updated for "${video.title}"`);
                URL.revokeObjectURL(blobUrl);
                resolve();
              } catch (err: any) {
                URL.revokeObjectURL(blobUrl);
                reject(err);
              }
            }, "image/jpeg", 0.85);
          } catch (e: any) {
            URL.revokeObjectURL(blobUrl);
            reject(e);
          }
        };

        vid.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          reject(new Error("Video failed to load from blob."));
        };
      } catch (err: any) {
        reject(err);
      }
    });
  };

  const startBatch = async () => {
    setProcessing(true);
    setResults([]);
    
    const newResults: { id: number, success: boolean }[] = [];
    
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      setCurrentTitle(v.title);
      setProgress(Math.round(((i) / videos.length) * 100));
      
      try {
        await generatePoster(v);
        newResults.push({ id: v.id, success: true });
      } catch (e: any) {
        console.error("Failed for", v.title, e);
        alert(`Failed on "${v.title}": ${e.message}`);
        newResults.push({ id: v.id, success: false });
      }
    }
    
    setResults(newResults);
    setProgress(100);
    setProcessing(false);
    setCurrentTitle("");
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24 font-sans">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-24">
        
        <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#E53945]/20 rounded-2xl flex items-center justify-center">
            <Sparkles size={32} className="text-[#E53945]" />
          </div>
          <h1 className="text-3xl font-black mb-2">Auto-Fix Posters</h1>
          <p className="text-sm text-white/60">
            We will scan your existing videos, grab a high-quality frame at the 90-second mark, and set it as the poster.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 bg-[#1c1c1e] border border-white/10 rounded-2xl">
            <p className="text-white/50">No videos need posters.</p>
          </div>
        ) : (
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-white/70">Found <strong className="text-white">{videos.length}</strong> videos to process.</p>
              <button 
                onClick={startBatch} 
                disabled={processing}
                className="bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition"
              >
                {processing ? "Processing..." : "Start Batch"}
              </button>
            </div>

            {processing && (
              <div className="mb-6 p-4 bg-black/40 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/60 truncate max-w-[80%]">{currentTitle}</p>
                  <p className="text-xs font-bold text-[#E53945]">{progress}%</p>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#E53945] transition-all duration-300" style={{ width: progress + "%" }} />
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((r, i) => {
                  const v = videos.find(vid => vid.id === r.id);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-black/20 rounded border border-white/5">
                      <span className="text-white/70 truncate max-w-[70%]">{v?.title}</span>
                      {r.success ? <CheckCircle2 size={14} className="text-green-500" /> : <span className="text-red-500">Failed</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
