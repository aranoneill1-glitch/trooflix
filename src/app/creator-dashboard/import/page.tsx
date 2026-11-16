"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileArchive, Download, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

function YouTubeIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.8 15.5v-7l6.2 3.5-6.2 3.5Z" />
    </svg>
  );
}

function InstagramIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.9 1.35a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
    </svg>
  );
}
import { unzipSync } from "fflate";
import { getCachedUser } from "@/lib/cache";
import { r2MultipartUpload } from "@/lib/r2Upload";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

type Source = "youtube" | "instagram";

export default function ImportPage() {
  const [source, setSource] = useState<Source | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const reset = () => {
    setFile(null);
    setProcessing(false);
    setProgress(0);
    setStatus("");
    setDone(false);
    setImportedCount(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith(".zip")) {
      setFile(droppedFile);
    } else {
      alert("Please upload a .zip export file.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const getVideoEntries = (unzipped: Record<string, Uint8Array>, src: Source) => {
    const keys = Object.keys(unzipped);
    if (src === "youtube") {
      return keys.filter((key) =>
        key.toLowerCase().endsWith(".mp4") && key.includes("YouTube and YouTube Music/videos/")
      );
    }
    // Instagram: include common video exports (posts/reels/stories/media)
    return keys.filter((key) => {
      const lower = key.toLowerCase();
      if (!(lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".m4v"))) return false;
      if (lower.endsWith("/")) return false;
      // Prefer likely content folders but allow any video in export
      return true;
    });
  };

  const getTitleAndType = (key: string, src: Source) => {
    const fileName = key.split("/").pop() || "video.mp4";
    const base = fileName.replace(/\.[^.]+$/, "");
    if (src === "youtube") {
      const title = base.split("-")[0]?.trim() || "Imported Video";
      return { title, type: "Documentary", description: "Imported from YouTube" };
    }
    const lower = key.toLowerCase();
    const isShort = lower.includes("/reels/") || lower.includes("/stories/");
    let title = base.replace(/[_-]+/g, " ").trim() || "Imported Video";
    // Clean common timestamp-like names a bit
    if (/^\d{6,}$/.test(title.replace(/\s/g, ""))) title = isShort ? "Imported Reel" : "Imported Video";
    return {
      title: title.slice(0, 120),
      type: isShort ? "short" : "long-video",
      description: "Imported from Instagram",
    };
  };

  const startImport = async () => {
    if (!file || !source) return;
    setProcessing(true);
    setProgress(5);
    setStatus(`Unzipping ${source === "youtube" ? "YouTube Takeout" : "Instagram"} file in browser...`);

    try {
      const user = await getCachedUser();
      if (!user) throw new Error("Not logged in");

      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      setProgress(15);
      setStatus("Reading zip contents...");
      const unzipped = unzipSync(uint8);

      const videoKeys = getVideoEntries(unzipped, source);

      if (videoKeys.length === 0) {
        throw new Error(
          source === "youtube"
            ? "No .mp4 files found. Did you select .mp4 as the format in Google Takeout?"
            : "No video files found in this Instagram export. Make sure you requested your posts/reels/videos in the export."
        );
      }

      let count = 0;

      for (let i = 0; i < videoKeys.length; i++) {
        const key = videoKeys[i];
        const videoData = unzipped[key];
        const fileName = key.split("/").pop() || "video.mp4";
        const meta = getTitleAndType(key, source);
        const ext = (fileName.split(".").pop() || "mp4").toLowerCase();
        const mime = ext === "mov" ? "video/quicktime" : ext === "m4v" ? "video/x-m4v" : "video/mp4";

        setStatus(`Uploading ${i + 1} of ${videoKeys.length}: ${meta.title}`);

        const blob = new Blob([videoData], { type: mime });
        const videoFile = new File([blob], fileName, { type: mime });

        const { publicUrl } = await r2MultipartUpload(videoFile, {
          folder: "videos",
          onProgress: (p) => {
            const overall = 15 + ((i / videoKeys.length) * 80) + ((p / 100) * (80 / videoKeys.length));
            setProgress(Math.min(99, Math.round(overall)));
          },
        });

        await fetch("/api/save-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: meta.title,
            description: meta.description,
            category: "Documentary",
            visibility: "public",
            type: meta.type,
            uploaderUserId: user.id,
            videoUrl: publicUrl,
            feed_visible: false,
          }),
        });

        count++;
      }

      setImportedCount(count);
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
      setStatus("");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24 font-sans">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)]">
        <div className="flex items-center justify-between mb-8">
          <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition text-sm font-semibold">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          {source && !processing && !done && (
            <button onClick={() => { setSource(null); reset(); }} className="text-sm text-white/60 hover:text-white transition">
              Change source
            </button>
          )}
        </div>

        <div className="mb-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-600/20 rounded-2xl flex items-center justify-center">
            <Download size={32} className="text-[#E53945]" />
          </div>
          <h1 className="text-3xl font-black mb-2">Import Content</h1>
          <p className="text-sm text-white/60">
            Bring your videos to Trooflix. Choose a source, upload your export .zip, and we&apos;ll import videos in your browser.
          </p>
        </div>

        {!source && !done && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setSource("youtube")}
              className="text-left bg-[#1c1c1e] border border-white/10 hover:border-red-500/40 rounded-2xl p-6 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center mb-4 group-hover:bg-red-600/30 transition">
                <YouTubeIcon size={24} className="text-[#E53945]" />
              </div>
              <h2 className="text-lg font-bold mb-1">YouTube</h2>
              <p className="text-sm text-white/60">Import from a Google Takeout export (.zip) of your YouTube videos.</p>
            </button>

            <button
              onClick={() => setSource("instagram")}
              className="text-left bg-[#1c1c1e] border border-white/10 hover:border-pink-500/40 rounded-2xl p-6 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition">
                <InstagramIcon size={24} className="text-pink-400" />
              </div>
              <h2 className="text-lg font-bold mb-1">Instagram</h2>
              <p className="text-sm text-white/60">Import videos/reels from your Instagram &quot;Download your information&quot; export (.zip).</p>
            </button>
          </div>
        )}

        {source && !file && !done && (
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              {source === "youtube" ? <YouTubeIcon size={22} className="text-[#E53945]" /> : <InstagramIcon size={22} className="text-pink-400" />}
              <h2 className="text-lg font-bold">Import from {source === "youtube" ? "YouTube" : "Instagram"}</h2>
            </div>

            {source === "youtube" ? (
              <>
                <h3 className="text-base font-semibold mb-3">How to get your Takeout file:</h3>
                <ol className="space-y-3 text-sm text-white/70 mb-8">
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">1</span><p>Go to <a href="https://takeout.google.com" target="_blank" rel="noreferrer" className="text-[#E53945] hover:underline">Google Takeout</a>.</p></li>
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">2</span><p>Click &quot;Deselect all&quot;, then select <strong>only</strong> &quot;YouTube and YouTube Music&quot;.</p></li>
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">3</span><p>Click &quot;Multiple formats&quot; and set video format to <strong>.mp4</strong>.</p></li>
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">4</span><p>Create export, download the .zip, then upload it here.</p></li>
                </ol>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold mb-3">How to get your Instagram export:</h3>
                <ol className="space-y-3 text-sm text-white/70 mb-8">
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">1</span><p>Open Instagram → <strong>Settings and privacy</strong> → <strong>Accounts Center</strong>.</p></li>
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">2</span><p>Go to <strong>Your information and permissions</strong> → <strong>Download your information</strong>.</p></li>
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">3</span><p>Select your Instagram account and include posts/reels/videos (or all available info), then choose <strong>Download to device</strong>.</p></li>
                  <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">4</span><p>When ready, download the .zip export and upload it here. Videos found in the archive will be imported as drafts.</p></li>
                </ol>
              </>
            )}

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
              <p className="font-bold text-white mb-1">Drag and drop your {source === "youtube" ? "Takeout" : "Instagram export"} .zip here</p>
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
            <p className="text-white/60 mb-8">
              {importedCount} video{importedCount === 1 ? "" : "s"} imported from {source === "youtube" ? "YouTube" : "Instagram"}. They were saved as drafts so you can review them.
            </p>
            <Link href="/creator-dashboard/manage-content" className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition">
              Go to Manage Content <ChevronRight size={18} />
            </Link>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
