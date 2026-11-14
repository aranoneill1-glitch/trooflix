"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileArchive, Download, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { unzipSync, strFromU8 } from "fflate";
import { getCachedUser } from "@/lib/cache";
import { r2MultipartUpload } from "@/lib/r2Upload";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".zip")) {
      setFile(droppedFile);
    } else {
      alert("Please upload a .zip file from Google Takeout.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const startImport = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);
    setStatus("Unzipping Takeout file in browser...");

    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in");

      // 1. Read the ZIP file
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      
      setProgress(15);
      setStatus("Reading zip contents...");
      const unzipped = unzipSync(uint8);

      // 2. Find all MP4 files in the zip
      const videoKeys = Object.keys(unzipped).filter((key) => 
        key.endsWith(".mp4") && key.includes("YouTube and YouTube Music/videos/")
      );

      if (videoKeys.length === 0) {
        throw new Error("No .mp4 files found. Did you select .mp4 as the format in Google Takeout?");
      }

      let importedCount = 0;

      // 3. Process each video
      for (let i = 0; i < videoKeys.length; i++) {
        const key = videoKeys[i];
        const videoData = unzipped[key];
        
        // YouTube Takeout names files like: "Video Title-abc123.mp4"
        const fileName = key.split("/").pop() || "video.mp4";
        const title = fileName.replace(".mp4", "").split("-")[0] || "Imported Video";
        
        setStatus(`Uploading ${i + 1} of ${videoKeys.length}: ${title}`);
        
        // Convert the uint8 array to a File object
        const blob = new Blob([videoData], { type: "video/mp4" });
        const videoFile = new File([blob], fileName, { type: "video/mp4" });

        // Upload to Cloudflare R2
        const { publicUrl } = await r2MultipartUpload(videoFile, {
          folder: "videos",
          onProgress: (p) => {
            // Calculate overall progress: 15% start + (video chunk progress)
            const overall = 15 + ((i / videoKeys.length) * 80) + ((p / 100) * (80 / videoKeys.length));
            setProgress(Math.min(99, Math.round(overall)));
          },
        });

        // 4. Save to database via existing API (saving as Draft)
        await fetch("/api/save-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title,
            description: "Imported from YouTube",
            category: "Documentary", // Default category, user can change later
            visibility: "public",
            type: "Documentary",
            uploaderUserId: user.id,
            videoUrl: publicUrl,
            feed_visible: false, // Keep as draft/hidden so they can review
          }),
        });

        importedCount++;
      }

      setProgress(100);
      setStatus("Import complete!");
      setTimeout(() => {
        setProcessing(false);
        setDone(true);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to import. Check the file and try again.");
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24 font-sans">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)]">
        <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="mb-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-600/20 rounded-2xl flex items-center justify-center">
            <Download size={32} className="text-[#E53945]" />
          </div>
          <h1 className="text-3xl font-black mb-2">Import from YouTube</h1>
          <p className="text-sm text-white/60">
            Bring your entire back-catalog to Trooflix safely. We extract the videos directly in your browser and upload them to your account.
          </p>
        </div>

        {!file && !done && (
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold mb-4">How to get your Takeout file:</h2>
            <ol className="space-y-3 text-sm text-white/70 mb-8">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">1</span>
                <p>Go to <a href="https://takeout.google.com" target="_blank" rel="noreferrer" className="text-[#E53945] hover:underline">Google Takeout</a>.</p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">2</span>
                <p>Click &quot;Deselect all&quot;, then scroll down and check <strong>only</strong> &quot;YouTube and YouTube Music&quot;.</p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">3</span>
                <p>Click &quot;Multiple formats&quot; and change the video format to <strong>.mp4</strong>.</p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">4</span>
                <p>Create the export. Google will email you a .zip file.</p>
              </li>
            </ol>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-white/20 hover:border-[#E53945]/50 bg-black/40 rounded-xl p-10 flex flex-col items-center justify-center transition cursor-pointer relative"
            >
              <input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileArchive size={40} className="text-white/40 mb-4" />
              <p className="font-bold text-white mb-1">Drag and drop your Takeout .zip here</p>
              <p className="text-xs text-white/50">Or click to browse your files</p>
            </div>
          </div>
        )}

        {file && !done && (
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-8 text-center">
            <FileArchive size={48} className="mx-auto text-[#E53945] mb-4" />
            <h2 className="text-xl font-bold mb-2">{file.name}</h2>
            <p className="text-sm text-white/50 mb-6">{(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB</p>

            {processing ? (
              <div className="space-y-4">
                <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-[#E53945] transition-all duration-300" style={{ width: progress + "%" }} />
                </div>
                <p className="text-sm font-bold text-white/80 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> {status}
                </p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setFile(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition">
                  Cancel
                </button>
                <button onClick={startImport} className="flex-1 py-3 bg-[#E53945] hover:bg-[#d12e39] rounded-xl font-bold transition">
                  Start Import
                </button>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-8 text-center">
            <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-black mb-2">Import Complete!</h2>
            <p className="text-white/60 mb-8">Your videos have been successfully imported to Trooflix.</p>
            <Link href="/creator-dashboard" className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition">
              Go to Dashboard <ChevronRight size={18} />
            </Link>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
